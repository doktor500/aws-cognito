# CDK TypeScript project

## Setup and deploy project

Install localstack if you want to test things locally (on MacOS, use `brew install localstack/tap/localstack-cli`):
Install cdk and cdklocal dependencies: `npm install -g aws-cdk aws-cdk-local `

To deploy the stacks:

```bash
cdk bootstrap
cdk deploy --all
```

To destroy the stacks:

```bash
cdk destroy Stacks: ApplicationStack && cdk destroy Stacks: AuthStack
```

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template

Before executing integration tests, run

```bash
LOCALSTACK_DEFAULT_REGION=us-east-1 localstack start -d
AWS_REGION=us-east-1 cdklocal bootstrap
AWS_REGION=us-east-1 cdklocal deploy
```

Executing acceptance test:

```bash
PAYMENTS_API_ENDPOINT=https://... BEARER_TOKEN=... npm run test:acceptance
```
