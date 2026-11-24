import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { isInactiveMesombApiKey } from '../_shared/mesombProviderError.ts';

Deno.test('an inactive MeSomb API key is a confirmed pre-collection refusal', () => {
  assertEquals(isInactiveMesombApiKey(new Error('This API Key is not active')), true);
});

Deno.test('a network failure stays uncertain and cannot be marked safe to retry', () => {
  assertEquals(isInactiveMesombApiKey(new Error('Network request failed')), false);
});

Deno.test('an operator refusal is not mistaken for merchant configuration', () => {
  assertEquals(isInactiveMesombApiKey(new Error('Subscriber balance is low')), false);
});
