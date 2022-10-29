const { createHmac } = require('crypto');
const { App } = require('@octokit/app');

/**
 * @description Handler for incoming GitHub App events.
 */
module.exports.handler = async (event) => {
  try {
    if (
      !process.env.GITHUB_APP_PRIVATE_KEY ||
      !process.env.GITHUB_APP_ID ||
      !process.env.GITHUB_APP_SECRET
    )
      throw new MissingEnvironmentVariablesError();

    const body = event.body && typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const headers = getHeaders(event);

    if (!isSignatureCorrect(headers, body)) return end(401, 'Bad signature');

    if (body.action === 'opened' || body.action === 'reopened')
      await comment(body, 'This is a comment coming from your own custom GitHub check!');

    return end(200);
  } catch (error) {
    const message = error.message;
    console.error(`Error: ${message}`);
    if (error.name === 'MissingEnvironmentVariablesError') return end(500, message);
    end(400, message);
  }
};

/**
 * @description End the Lambda call.
 */
function end(statusCode, body = '') {
  return {
    statusCode,
    body: JSON.stringify(body)
  };
}

/**
 * @description Get correct headers and ensure we lowercase all of them.
 */
function getHeaders(event) {
  return {
    'x-hub-signature-256': event?.['headers']?.['X-Hub-Signature-256'],
    'x-github-event': event?.['headers']?.['X-GitHub-Event']
  };
}

/**
 * @description Check if we have a signature match between the incoming one and ours.
 */
function isSignatureCorrect(headers, body) {
  const callerSignature = headers['x-hub-signature-256'];
  const thisSignature = signRequestBody(process.env.GITHUB_APP_SECRET || '', JSON.stringify(body));
  return callerSignature === thisSignature;
}

/**
 * @description Sign our request body.
 */
const signRequestBody = (secret, body) =>
  `sha256=${createHmac('sha256', secret).update(body, 'utf8').digest('hex')}`;

/**
 * @description The actual business logic of writing the PR comment.
 */
const comment = async (event, message) => {
  const app = new App({
    // See: https://github.com/auth0/node-jsonwebtoken/issues/642
    privateKey: process.env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/gm, '\n') || '',
    appId: process.env.GITHUB_APP_ID || '',
    webhooks: {
      secret: process.env.GITHUB_APP_SECRET || ''
    }
  });

  const octokit = await app.getInstallationOctokit(event.installation.id);
  return octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
    owner: event.repository.owner.login,
    repo: event.repository.name,
    issue_number: event.number,
    body: message
  });
};

class MissingEnvironmentVariablesError extends Error {
  constructor() {
    super();
    this.name = 'MissingEnvironmentVariablesError';
    const message = `Missing required environment variables!`;
    this.message = message;

    console.error(message);
  }
}
