import { z } from 'zod';
import { issuesToFieldErrors } from './validation.js';

describe('issuesToFieldErrors', () => {
  it('groups messages by dotted path', async () => {
    const schema = z.object({
      name: z.string().min(1),
      guardians: z.array(z.object({ email: z.email() })),
    });

    const result = await schema['~standard'].validate({
      name: '',
      guardians: [{ email: 'not-an-email' }],
    });
    if (!result.issues) throw new Error('expected issues');

    const errors = issuesToFieldErrors(result.issues);

    expect(Object.keys(errors).sort()).toEqual(['guardians.0.email', 'name']);
  });
});
