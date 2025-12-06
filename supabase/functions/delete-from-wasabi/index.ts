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

async function sha256(data: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', data);
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

    // Parse endpoint to get host
    endpoint = endpoint.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const host = `${bucketName}.${endpoint}`;
    const baseUrl = `https://${host}`;

    const { fileUrl } = await req.json();

    if (!fileUrl) {
      throw new Error('URL do arquivo é obrigatória');
    }

    console.log(`Deleting file: ${fileUrl}`);

    // Extract object key from URL
    const urlParts = fileUrl.replace(baseUrl + '/', '');
    const objectKey = urlParts;

    if (!objectKey) {
      throw new Error('Chave do arquivo inválida');
    }

    console.log(`Object key: ${objectKey}`);

    // AWS Signature V4 signing for DELETE
    const method = 'DELETE';
    const service = 's3';
    const region = 'us-east-1';
    
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    // For DELETE, the payload is empty
    const payloadHash = await sha256(new TextEncoder().encode('').buffer as ArrayBuffer);
    const canonicalUri = '/' + objectKey;
    const canonicalQuerystring = '';
    const canonicalHeaders = 
      `host:${host}\n` +
      `x-amz-content-sha256:${payloadHash}\n` +
      `x-amz-date:${amzDate}\n`;
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
    
    const canonicalRequest = 
      `${method}\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

    // Create string to sign
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const canonicalRequestHash = await sha256(new TextEncoder().encode(canonicalRequest).buffer as ArrayBuffer);
    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;

    // Calculate signature
    const signingKey = await getSignatureKey(secretKey, dateStamp, region, service);
    const signatureBuffer = await hmacSha256(signingKey, stringToSign);
    const signature = toHex(signatureBuffer);

    // Create authorization header
    const authorizationHeader = 
      `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    // Delete from Wasabi
    const deleteUrl = `${baseUrl}/${objectKey}`;
    console.log(`Delete URL: ${deleteUrl}`);

    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Host': host,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
        'Authorization': authorizationHeader,
      },
    });

    // 204 No Content is success for DELETE
    if (!response.ok && response.status !== 204) {
      const errorText = await response.text();
      console.error('Wasabi error response:', errorText);
      throw new Error(`Delete failed: ${response.status} - ${errorText}`);
    }

    console.log(`File deleted successfully: ${objectKey}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Arquivo excluído com sucesso',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Error deleting from Wasabi:', errorMessage);
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
