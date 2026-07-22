const $ = (id) => document.getElementById(id);

function parseBig(raw, name) {
  const text = raw.trim();
  if (!/^\d+$/.test(text)) throw new Error(`${name} must be a positive whole number.`);
  const value = BigInt(text);
  if (value <= 0n) throw new Error(`${name} must be greater than zero.`);
  return value;
}

function modPow(base, exp, mod) {
  let result = 1n;
  let b = base % mod;
  let e = exp;
  while (e > 0n) {
    if (e & 1n) result = (result * b) % mod;
    b = (b * b) % mod;
    e >>= 1n;
  }
  return result;
}

function gcd(a, b) {
  while (b !== 0n) [a, b] = [b, a % b];
  return a < 0n ? -a : a;
}

function modInverse(value, mod) {
  let t = 0n, nextT = 1n;
  let r = mod, nextR = ((value % mod) + mod) % mod;
  while (nextR !== 0n) {
    const quotient = r / nextR;
    [t, nextT] = [nextT, t - quotient * nextT];
    [r, nextR] = [nextR, r - quotient * nextR];
  }
  if (r !== 1n) throw new Error(`${value} has no inverse modulo ${mod}.`);
  return t < 0n ? t + mod : t;
}

function isPrime(n) {
  if (n < 2n) return false;
  if (n === 2n) return true;
  if (n % 2n === 0n) return false;
  for (let d = 3n; d * d <= n; d += 2n) {
    if (n % d === 0n) return false;
  }
  return true;
}

function randomBigInt(min, max) {
  const lo = BigInt(min);
  const hi = BigInt(max);
  return lo + BigInt(Math.floor(Math.random() * Number(hi - lo + 1n)));
}

function randomPrime(min, max) {
  for (let tries = 0; tries < 3000; tries++) {
    let candidate = randomBigInt(min, max);
    if (candidate % 2n === 0n) candidate += 1n;
    if (candidate <= BigInt(max) && isPrime(candidate)) return candidate;
  }
  throw new Error('Could not find a random prime in range.');
}

function generateValidParameters() {
  for (let tries = 0; tries < 3000; tries++) {
    const subgroupSize = randomPrime(23n, 97n);
    const multiplier = randomBigInt(2n, 26n);
    const primeModulus = multiplier * subgroupSize + 1n;
    if (!isPrime(primeModulus)) continue;

    for (let hTries = 0; hTries < 200; hTries++) {
      const generatorSeed = randomBigInt(2n, primeModulus - 2n);
      const generatorExponent = (primeModulus - 1n) / subgroupSize;
      const signingBase = modPow(generatorSeed, generatorExponent, primeModulus);
      if (signingBase > 1n) return { primeModulus, subgroupSize, generatorSeed };
    }
  }
  throw new Error('Could not generate valid DSA parameters. Try again.');
}

function hashMessage(message, subgroupSize) {
  let hash = 0n;
  for (const ch of message) hash = (hash + BigInt(ch.codePointAt(0))) % subgroupSize;
  return hash;
}

function normalizeSecret(seed, subgroupSize) {
  return ((seed - 1n) % (subgroupSize - 1n)) + 1n;
}

function deriveParameters() {
  const primeModulus = parseBig($('primeModulus').value, 'Prime modulus p');
  const subgroupSize = parseBig($('subgroupSize').value, 'Subgroup prime q');
  const generatorSeed = parseBig($('generatorSeed').value, 'Generator seed h');

  if (!isPrime(primeModulus)) throw new Error('p must be prime.');
  if (!isPrime(subgroupSize)) throw new Error('q must be prime.');
  if ((primeModulus - 1n) % subgroupSize !== 0n) throw new Error('q must divide p - 1.');
  if (generatorSeed <= 1n || generatorSeed >= primeModulus - 1n) {
    throw new Error('h must be greater than 1 and less than p - 1.');
  }

  const generatorExponent = (primeModulus - 1n) / subgroupSize;
  const signingBase = modPow(generatorSeed, generatorExponent, primeModulus);
  if (signingBase <= 1n) throw new Error('This h creates g = 1. Choose another h.');
  return { primeModulus, subgroupSize, generatorSeed, generatorExponent, signingBase };
}

function sign(message, params, privateSeed, nonceSeed) {
  const privateSigningKey = normalizeSecret(privateSeed, params.subgroupSize);
  const oneTimeSigningSecret = normalizeSecret(nonceSeed, params.subgroupSize);
  if (gcd(oneTimeSigningSecret, params.subgroupSize) !== 1n) {
    throw new Error('The one-time signing secret must be invertible modulo q.');
  }

  const messageFingerprint = hashMessage(message, params.subgroupSize);
  const publicVerificationKey = modPow(params.signingBase, privateSigningKey, params.primeModulus);
  const commitmentBeforeReduction = modPow(params.signingBase, oneTimeSigningSecret, params.primeModulus);
  const signatureCommitment = commitmentBeforeReduction % params.subgroupSize;
  const oneTimeInverse = modInverse(oneTimeSigningSecret, params.subgroupSize);
  const signatureProof = (oneTimeInverse * ((messageFingerprint + privateSigningKey * signatureCommitment) % params.subgroupSize)) % params.subgroupSize;

  if (signatureCommitment === 0n || signatureProof === 0n) {
    throw new Error('This one-time secret produced a zero signature part. Change the nonce seed.');
  }

  return {
    privateSigningKey,
    oneTimeSigningSecret,
    messageFingerprint,
    publicVerificationKey,
    commitmentBeforeReduction,
    signatureCommitment,
    oneTimeInverse,
    signatureProof,
  };
}

function verify(message, params, publicVerificationKey, signatureCommitment, signatureProof) {
  if (signatureCommitment <= 0n || signatureCommitment >= params.subgroupSize || signatureProof <= 0n || signatureProof >= params.subgroupSize) {
    return { valid: false, reason: 'Both signature parts must be between 1 and q - 1.' };
  }
  const messageFingerprint = hashMessage(message, params.subgroupSize);
  const proofInverse = modInverse(signatureProof, params.subgroupSize);
  const messageWeight = (messageFingerprint * proofInverse) % params.subgroupSize;
  const keyWeight = (signatureCommitment * proofInverse) % params.subgroupSize;
  const messageSide = modPow(params.signingBase, messageWeight, params.primeModulus);
  const keySide = modPow(publicVerificationKey, keyWeight, params.primeModulus);
  const recomputedCommitment = ((messageSide * keySide) % params.primeModulus) % params.subgroupSize;
  return { valid: recomputedCommitment === signatureCommitment, messageFingerprint, proofInverse, messageWeight, keyWeight, messageSide, keySide, recomputedCommitment };
}

function line(title, formula, side = 'sender') {
  return `<article class="step ${side === 'receiver' ? 'receiver-step' : ''}"><h3>${title}</h3><code>${formula}</code></article>`;
}

function codeSum(message) {
  return [...message].map((ch) => ch.codePointAt(0)).join(' + ') || '0';
}

function renderVerdict(result) {
  const verdict = $('verdict');
  verdict.className = `verdict ${result.valid ? 'valid' : 'invalid'}`;
  verdict.textContent = result.valid ? 'Signature is valid' : 'Signature is invalid';
}

function renderError(message) {
  const verdict = $('verdict');
  verdict.className = 'verdict invalid';
  verdict.textContent = message;
}

function rollParameters() {
  try {
    const generated = generateValidParameters();
    $('primeModulus').value = generated.primeModulus;
    $('subgroupSize').value = generated.subgroupSize;
    $('generatorSeed').value = generated.generatorSeed;
    renderSigningFlow();
  } catch (error) {
    renderError(error.message);
  }
}

function rollSecrets() {
  $('privateSeed').value = randomBigInt(1000n, 999999n);
  $('nonceSeed').value = randomBigInt(1000n, 999999n);
  renderSigningFlow();
}

function renderSigningFlow() {
  try {
    const params = deriveParameters();
    const message = $('message').value;
    const privateSeed = parseBig($('privateSeed').value, 'Private key seed');
    const nonceSeed = parseBig($('nonceSeed').value, 'One-time secret seed');
    const signature = sign(message, params, privateSeed, nonceSeed);
    const verification = verify(message, params, signature.publicVerificationKey, signature.signatureCommitment, signature.signatureProof);

    $('receivedMessage').value = message;
    $('receivedY').value = signature.publicVerificationKey;
    $('receivedCommitment').value = signature.signatureCommitment;
    $('receivedProof').value = signature.signatureProof;
    $('sentMessage').textContent = message || '(empty message)';
    $('sentY').textContent = signature.publicVerificationKey;
    $('sentSignature').textContent = `commitment ${signature.signatureCommitment}, proof ${signature.signatureProof}`;

    const packet = $('packetView');
    packet.classList.remove('sent');
    void packet.offsetWidth;
    packet.classList.add('sent');

    $('steps').innerHTML = [
      line('Choose public DSA parameters', `prime modulus = ${params.primeModulus}, subgroup prime = ${params.subgroupSize}, signing base = generator_seed^((prime_modulus - 1)/subgroup_prime) mod prime_modulus = ${params.generatorSeed}^${params.generatorExponent} mod ${params.primeModulus} = ${params.signingBase}`),
      line('Normalize sender private seed', `private signing key = ((seed - 1) mod (subgroup_prime - 1)) + 1 = ${signature.privateSigningKey}`),
      line('Create public verification key', `public verification key = signing_base^private_signing_key mod prime_modulus = ${params.signingBase}^${signature.privateSigningKey} mod ${params.primeModulus} = ${signature.publicVerificationKey}`),
      line('Hash the message', `message fingerprint = (${codeSum(message)}) mod ${params.subgroupSize} = ${signature.messageFingerprint}`),
      line('Create signature commitment', `commitment = (g^one_time_secret mod p) mod q = (${signature.commitmentBeforeReduction}) mod ${params.subgroupSize} = ${signature.signatureCommitment}`),
      line('Create signature proof', `proof = inverse(one_time_secret) * (fingerprint + private_key * commitment) mod q = ${signature.oneTimeInverse} * (${signature.messageFingerprint} + ${signature.privateSigningKey} * ${signature.signatureCommitment}) mod ${params.subgroupSize} = ${signature.signatureProof}`),
      line('Receiver hashes received message', `message fingerprint = (${codeSum(message)}) mod ${params.subgroupSize} = ${verification.messageFingerprint}`, 'receiver'),
      line('Receiver inverts the proof', `proof inverse = proof^-1 mod q = ${verification.proofInverse}`, 'receiver'),
      line('Receiver weighs the message', `message weight = fingerprint * proof_inverse mod q = ${verification.messageWeight}`, 'receiver'),
      line('Receiver weighs the public key', `key weight = commitment * proof_inverse mod q = ${verification.keyWeight}`, 'receiver'),
      line('Receiver recomputes the commitment', `check value = ((g^message_weight * public_key^key_weight) mod p) mod q = ${verification.recomputedCommitment}`, 'receiver'),
      line('Receiver compares both seals', `recomputed commitment == sent commitment -> ${verification.recomputedCommitment} == ${signature.signatureCommitment}`, 'receiver'),
    ].join('');
    renderVerdict(verification);
  } catch (error) {
    renderError(error.message);
  }
}

function verifyReceived() {
  try {
    const params = deriveParameters();
    const message = $('receivedMessage').value;
    const publicVerificationKey = parseBig($('receivedY').value, 'Public verification key');
    const signatureCommitment = parseBig($('receivedCommitment').value, 'Signature commitment');
    const signatureProof = parseBig($('receivedProof').value, 'Signature proof');
    const result = verify(message, params, publicVerificationKey, signatureCommitment, signatureProof);
    $('steps').innerHTML = result.reason
      ? line('Receiver rejects packet', result.reason, 'receiver')
      : [
        line('Receiver hashes received message', `message fingerprint = (${codeSum(message)}) mod ${params.subgroupSize} = ${result.messageFingerprint}`, 'receiver'),
        line('Receiver inverts the proof', `proof inverse = proof^-1 mod q = ${result.proofInverse}`, 'receiver'),
        line('Receiver weighs the message', `message weight = fingerprint * proof_inverse mod q = ${result.messageWeight}`, 'receiver'),
        line('Receiver weighs the public key', `key weight = commitment * proof_inverse mod q = ${result.keyWeight}`, 'receiver'),
        line('Receiver recomputes the commitment', `check value = ((g^message_weight * public_key^key_weight) mod p) mod q = ${result.recomputedCommitment}`, 'receiver'),
        line('Receiver compares both seals', `recomputed commitment == sent commitment -> ${result.recomputedCommitment} == ${signatureCommitment}`, 'receiver'),
      ].join('');
    renderVerdict(result);
  } catch (error) {
    renderError(error.message);
  }
}

$('runDsa').addEventListener('click', renderSigningFlow);
$('verifyOnly').addEventListener('click', verifyReceived);
$('rollParams').addEventListener('click', rollParameters);
$('rollSecrets').addEventListener('click', rollSecrets);
renderSigningFlow();
