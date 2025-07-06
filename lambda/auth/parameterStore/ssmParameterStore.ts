import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const ssmClient = new SSMClient();

const getSecuredParameterValue = async (parameterName: string): Promise<string> => {
  const command = new GetParameterCommand({ Name: parameterName, WithDecryption: true });
  const response = await ssmClient.send(command);

  if (!response.Parameter?.Value) {
    throw new Error(`Failed to retrieve parameter ${parameterName} from SSM`);
  }

  return response.Parameter.Value;
}

export const ssmParameterStore = { getSecuredParameterValue };
