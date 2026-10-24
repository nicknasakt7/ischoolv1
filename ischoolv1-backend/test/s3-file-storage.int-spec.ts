import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from 'testcontainers';
import { S3FileStorage } from '../src/infrastructure/storage/s3-file-storage.js';

describe('S3FileStorage', () => {
  let container: StartedTestContainer;
  let storage: S3FileStorage;

  beforeAll(async () => {
    container = await new GenericContainer('rustfs/rustfs:1.0.3')
      .withEnvironment({
        RUSTFS_ACCESS_KEY: 'test',
        RUSTFS_SECRET_KEY: 'test-secret',
      })
      .withExposedPorts(9000)
      .withWaitStrategy(Wait.forListeningPorts())
      .start();

    storage = new S3FileStorage({
      endpoint: `http://${container.getHost()}:${container.getMappedPort(9000)}`,
      region: 'auto',
      bucket: 'test-files',
      accessKeyId: 'test',
      secretAccessKey: 'test-secret',
      forcePathStyle: true,
    });
    await storage.ensureBucket();
  });

  afterAll(async () => {
    await container.stop();
  });

  it('serves an uploaded file only through a signed URL', async () => {
    const key = 'conduct-evidence/record-1.txt';
    await storage.put(key, new TextEncoder().encode('evidence'), 'text/plain');

    const url = await storage.signedDownloadUrl(key, 60);
    const signed = await fetch(url);
    expect(await signed.text()).toBe('evidence');

    const unsigned = await fetch(url.split('?')[0]!);
    expect(unsigned.status).toBe(403);
  });

  it('removes a deleted file', async () => {
    const key = 'tmp/delete-me.txt';
    await storage.put(key, new TextEncoder().encode('x'), 'text/plain');
    await storage.delete(key);

    const response = await fetch(await storage.signedDownloadUrl(key, 60));
    expect(response.status).toBe(404);
  });
});
