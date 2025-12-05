import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper functions for AWS Signature V4
function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

async function sha256(data: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return toHex(hash);
}

async function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): Promise<ArrayBuffer> {
  const kDate = await hmacSha256(new TextEncoder().encode("AWS4" + key).buffer as ArrayBuffer, dateStamp);
  const kRegion = await hmacSha256(kDate, regionName);
  const kService = await hmacSha256(kRegion, serviceName);
  const kSigning = await hmacSha256(kService, "aws4_request");
  return kSigning;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessKey = Deno.env.get('WASABI_ACCESS_KEY');
    const secretKey = Deno.env.get('WASABI_SECRET_KEY');
    const bucketName = Deno.env.get('WASABI_BUCKET_NAME');
    let endpoint = Deno.env.get('WASABI_ENDPOINT') || '';

    if (!accessKey || !secretKey || !bucketName || !endpoint) {
      console.error('Missing Wasabi configuration');
      throw new Error('Configuração do Wasabi incompleta');
    }

    const { fileKey } = await req.json();

    if (!fileKey) {
      throw new Error('fileKey é obrigatório');
    }

    console.log(`Generating signed URL for: ${fileKey}`);

    // Parse endpoint to get host
    endpoint = endpoint.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const host = `${bucketName}.${endpoint}`;
    const region = 'us-east-1';
    const service = 's3';
    const expiresIn = 300; // 5 minutes

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    // Create canonical request for GET with query string authentication
    const method = 'GET';
    const canonicalUri = '/' + fileKey;
    
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const credential = `${accessKey}/${credentialScope}`;
    
    // Query parameters for pre-signed URL
    const queryParams = new URLSearchParams({
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': credential,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': expiresIn.toString(),
      'X-Amz-SignedHeaders': 'host',
    });

    // Sort query parameters
    const sortedParams = new URLSearchParams([...queryParams.entries()].sort());
    const canonicalQuerystring = sortedParams.toString();

    const canonicalHeaders = `host:${host}\n`;
    const signedHeaders = 'host';
    const payloadHash = 'UNSIGNED-PAYLOAD';

    const canonicalRequest = 
      `${method}\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

    // Create string to sign
    const algorithm = 'AWS4-HMAC-SHA256';
    const canonicalRequestHash = await sha256(canonicalRequest);
    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;

    // Calculate signature
    const signingKey = await getSignatureKey(secretKey, dateStamp, region, service);
    const signatureBuffer = await hmacSha256(signingKey, stringToSign);
    const signature = toHex(signatureBuffer);

    // Construct the signed URL
    const signedUrl = `https://${host}/${fileKey}?${canonicalQuerystring}&X-Amz-Signature=${signature}`;

    console.log(`Generated signed URL successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        signedUrl,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Error generating signed URL:', errorMessage);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
