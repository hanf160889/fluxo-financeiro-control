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

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'uploads';

    if (!file) {
      throw new Error('Nenhum arquivo enviado');
    }

    console.log(`Uploading file: ${file.name}, size: ${file.size}, type: ${file.type}`);

    // Create unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop();
    const objectKey = `${folder}/${timestamp}-${randomStr}.${extension}`;

    // Convert file to ArrayBuffer
    const fileArrayBuffer = await file.arrayBuffer();

    // AWS Signature V4 signing
    const method = 'PUT';
    const service = 's3';
    const region = 'us-east-1';
    
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    // Create canonical request
    const payloadHash = await sha256(fileArrayBuffer);
    const canonicalUri = '/' + objectKey;
    const canonicalQuerystring = '';
    const canonicalHeaders = 
      `content-type:${file.type}\n` +
      `host:${host}\n` +
      `x-amz-content-sha256:${payloadHash}\n` +
      `x-amz-date:${amzDate}\n`;
    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
    
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

    // Upload to Wasabi
    const uploadUrl = `${baseUrl}/${objectKey}`;
    console.log(`Upload URL: ${uploadUrl}`);

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
        'Host': host,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
        'Authorization': authorizationHeader,
      },
      body: fileArrayBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Wasabi error response:', errorText);
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }

    // Construct the public URL
    const fileUrl = `${baseUrl}/${objectKey}`;
    console.log(`File uploaded successfully: ${fileUrl}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        url: fileUrl,
        fileName: file.name,
        key: objectKey,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Error uploading to Wasabi:', errorMessage);
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
