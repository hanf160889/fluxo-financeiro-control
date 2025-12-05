import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.540.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessKey = Deno.env.get('WASABI_ACCESS_KEY');
    const secretKey = Deno.env.get('WASABI_SECRET_KEY');
    const bucketName = Deno.env.get('WASABI_BUCKET_NAME');
    const endpoint = Deno.env.get('WASABI_ENDPOINT');

    if (!accessKey || !secretKey || !bucketName || !endpoint) {
      console.error('Missing Wasabi configuration');
      throw new Error('Configuração do Wasabi incompleta');
    }

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
    const fileName = `${folder}/${timestamp}-${randomStr}.${extension}`;

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);

    // Initialize S3 client for Wasabi
    const s3Client = new S3Client({
      region: 'us-east-1', // Wasabi uses this as default
      endpoint: endpoint.startsWith('http') ? endpoint : `https://${endpoint}`,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      forcePathStyle: true, // Required for Wasabi
    });

    // Upload to Wasabi
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: fileBuffer,
      ContentType: file.type,
    });

    await s3Client.send(command);

    // Construct the public URL
    const fileUrl = `${endpoint.startsWith('http') ? endpoint : `https://${endpoint}`}/${bucketName}/${fileName}`;

    console.log(`File uploaded successfully: ${fileUrl}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        url: fileUrl,
        fileName: file.name,
        key: fileName,
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
