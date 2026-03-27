const fs = require('fs');
const p = 'C:/Users/nbobb/shotspotwork/ShotSpotMainApp/apps/api/src/routes/photographers.ts';
let code = fs.readFileSync(p, 'utf8');

const newRoutes = `
  const uploadUrlsSchema = z.object({
    files: z.array(z.object({
      key: z.string().min(1),
      contentType: z.string().min(1)
    }))
  });

  app.post(
    '/api/photographers/me/uploads/urls',
    withZodValidation({ body: uploadUrlsSchema }, async (request, reply) => {
      const accountId = await requirePhotographerAccountId(request, reply, deps);
      if (!accountId) {
        return;
      }

      const body = request.body as z.infer<typeof uploadUrlsSchema>;
      const urls = await deps.storageUploadSigner.issueUploadUrls(body.files);

      return reply.status(200).send({ urls });
    })
  );

  const registerPhotosSchema = z.object({
    bookingId: z.string().uuid(),
    photos: z.array(z.object({
      objectKeyOriginal: z.string().min(1),
      fileName: z.string().optional(),
      mimeType: z.string().optional()
    }))
  });

  app.post(
    '/api/photographers/me/photos',
    withZodValidation({ body: registerPhotosSchema }, async (request, reply) => {
      const accountId = await requirePhotographerAccountId(request, reply, deps);
      if (!accountId) {
        return;
      }

      const body = request.body as z.infer<typeof registerPhotosSchema>;
      const count = await deps.parityFlowRepo.registerStoragePhotos(
        body.bookingId,
        accountId,
        body.photos
      );

      return reply.status(200).send({ ok: true, registeredCount: count });
    })
  );
`;

if (!code.includes('/api/photographers/me/uploads/urls')) {
  code = code.replace(/}\s*$/, newRoutes + '\n}');
  fs.writeFileSync(p, code);
  console.log('patched photographers routes');
} else {
  console.log('already patched');
}
