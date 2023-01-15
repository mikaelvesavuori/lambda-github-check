# Example: Serverless GitHub App (Checks API) running on AWS Lambda

**Ready-to-use GitHub check basis for AWS Lambda**.

This repo presents a ready-to-use interpretation of [Kurt Hutten's tutorial for serverless GitHub Apps](https://kurthutten.com/blog/getting-start-with-a-serverless-github-app/) but with some fixes/adjustments and it also works with [Serverless Framework](https://www.serverless.com).

[GitHub Apps](https://docs.github.com/en/developers/apps/getting-started-with-apps/about-apps) allow you to use the [Checks API](https://docs.github.com/en/rest/checks), something you might have considered if you've ever integrated third-party apps for your CI jobs and felt you wanted to build something just like that yourself.

Out of the box, this Check just [writes a comment to any opened/reopened pull requests](https://docs.github.com/en/rest/pulls/comments) in repositories the Check has access to. You can adapt this as you want and need, and you can certainly hook it to work on any other GitHub events too.

Refer to the [Issues API](https://docs.github.com/en/rest/issues) for more details.

## Technical considerations

**Writing for transparency, feel free to skip!**

I love TypeScript and feel that Webpack is a natural part of bundling serverless apps, but I am sorry to tell you it's not been a rudimentary experience getting those things working with GitHub's [octokit](https://github.com/octokit). We use `octokit` here to make it easier to work with the GitHub APIs. The problem is that it seems `octokit` is using the older standard of bundling their apps, meaning we end up with Webpack bundles having dumb issues like missing `crypto`. There is no easy way to solve this other than simply ditching Webpack altogether.

If you'd _really_ want to use TypeScript that would be doable by manually compiling and bundling the ZIP artifact, and then providing Serverless Framework with it. This way we wouldn't need Webpack at all, but can at least get TypeScript going. I've decided against providing an off-the-shelf solution with this approach because it will be confusing and non-standard.

The best option would simply be to replace `octokit` with manual REST calls but this will add a bit more low-level stuff to what was intended to be an easy-to-follow example. For the sake of demonstration I ultimately accepted that it's fine to distribute this as a working implementation but foregoing Webpack and TypeScript. So there you have it.

## Prerequisites

- GitHub account
- AWS account with enough credentials to set up stacks with Lambda, S3, API Gateway, etc.
- Logged into AWS in your environment

## Instructions

The below adapts the major steps in the [official guide](https://docs.github.com/en/developers/apps/getting-started-with-apps/setting-up-your-development-environment-to-create-a-github-app). I recommend that you scan that guide while you follow the below steps as I am not necessarily mentioning every single detail you need to do.

### Deploy the app

- Install dependencies with `npm install`.
- Deploy the application with `npm run deploy`.
- Note the endpoint for the function, which will look similar to `https://SOMETHING_RANDOM.execute-api.REGION.amazonaws.com/dev`.

### Setup on the GitHub side

- [Register a GitHub App](https://docs.github.com/en/developers/apps/getting-started-with-apps/setting-up-your-development-environment-to-create-a-github-app#step-2-register-a-new-github-app).
- Provide it with a "webhook secret". You can easily generate a secret with a service like [Norton Password Generator](https://my.norton.com/extspa/passwordmanager?path=pwd-gen).
- Note down the application ID, webhook secret, and download the "private key" file for the next steps.

### Configuration

#### App ID and secret

- Add the application ID to `serverless.yml` on the `GITHUB_APP_ID` variable at the bottom. It has the format `123456`.
- Add the webhook secret to `serverless.yml` on the `GITHUB_APP_SECRET` variable at the bottom.

#### Private key

**The underlying command assumes you are on a Mac. If you are on anything other than Mac or Linux you will need to figure out how to do this.**

- Convert the existing (PKCS1) private key into PKCS8 format. Begin by placing your private key file (`.pem` format) into the repo/source code location so we can access the file.
- With the key in the repo location, rename it `private-key.pem` so our next command will find the right file.
- Run `npm run convert`. You will end up with a new PKCS8-type key file named `private-key-pkcs8.pem`. The file has this type of format:

```
-----BEGIN PRIVATE KEY-----
SOME_VERY_LONG_VALUES
GOING_ON_FOR_MANY_MANY_LINES
-----END PRIVATE KEY-----
```

- We will need to store the new PKCS8 private key value as _a single line_ in `serverless.yml` under the `GITHUB_APP_PRIVATE_KEY` variable. To do this, simply exchange each (optical) line ending with `\n` (newline character) and remove the optical line endings. Paste the resulting, very long single line value in `GITHUB_APP_PRIVATE_KEY`. It will look something like `-----BEGIN PRIVATE KEY-----\nSOME_VERY_LONG_VALUES\nGOING_ON_FOR_MANY_MANY_LINES\n-----END PRIVATE KEY-----\n`. Don't forget that last `\n` at the very end!

### Redeployment

Run `npm run deploy` again.

## Removing the app

Run `npm run teardown`.

## Using the check

If you open (or reopen) a pull request on a repository on which this Check may act, this check will post a message to the comments.

![Demo GitHub Check message](./demo-message.png)

## Security notice

For real production use you should of course not write out the `GITHUB_APP_PRIVATE_KEY` and `GITHUB_APP_SECRET` in clear text. Instead, consider [using AWS Secrets Manager with Serverless Framework to store and retrieve these values](https://www.serverless.com/framework/docs/providers/aws/guide/variables#reference-variables-using-aws-secrets-manager).

## Resources and references

- https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks
- https://github.com/settings/apps/
- https://docs.github.com/en/rest/guides/getting-started-with-the-checks-api
- https://docs.github.com/en/developers/apps/getting-started-with-apps/setting-up-your-development-environment-to-create-a-github-app
- https://stackoverflow.com/questions/8290435/convert-pem-traditional-private-key-to-pkcs8-private-key
- https://kurthutten.com/blog/getting-start-with-a-serverless-github-app/
- https://thecodebarbarian.com/building-a-github-app-with-node-js.html
