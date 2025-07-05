import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

export const dynamoDB = () => {
    return new DynamoDBClient({
        endpoint: process.env.AWS_ENDPOINT,
        region: process.env.AWS_REGION,
    });
};