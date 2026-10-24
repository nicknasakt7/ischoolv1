import { Global, Module } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service.js';
import { FILE_STORAGE } from './file-storage.js';
import { S3FileStorage } from './s3-file-storage.js';

@Global()
@Module({
  providers: [
    {
      provide: FILE_STORAGE,
      inject: [AppConfigService],
      useFactory: async (config: AppConfigService) => {
        const storage = new S3FileStorage({
          endpoint: config.get('STORAGE_ENDPOINT'),
          region: config.get('STORAGE_REGION'),
          bucket: config.get('STORAGE_BUCKET'),
          accessKeyId: config.get('STORAGE_ACCESS_KEY_ID'),
          secretAccessKey: config.get('STORAGE_SECRET_ACCESS_KEY'),
          forcePathStyle: config.get('STORAGE_FORCE_PATH_STYLE'),
        });
        if (config.get('APP_ENV') === 'local') {
          await storage.ensureBucket();
        }
        return storage;
      },
    },
  ],
  exports: [FILE_STORAGE],
})
export class StorageModule {}
