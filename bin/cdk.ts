#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ApplicationStack } from '../lib/application-stack';

const app = new cdk.App();

/* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
new ApplicationStack(app, 'ApplicationStack', {
    env: {
        region: process.env.AWS_REGION ?? 'us-east-1'
    }
});