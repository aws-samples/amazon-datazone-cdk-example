// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from 'aws-cdk-lib';
import { aws_datazone } from 'aws-cdk-lib';
import * as datazone from 'aws-cdk-lib/aws-datazone';
import { Construct } from 'constructs';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import projectEnvironmentConfigs = require('../config/project_environment_config.json');
import { getEnvironmentMapKey, getEnvProfileMapKey } from '../helper/common';

export interface DataZoneEnvironmentStackProps extends cdk.StackProps {
  readonly domainId: string;
  readonly projectMap: Map<string, datazone.CfnProject>;
  readonly envProfileMap: Map<string, datazone.CfnEnvironmentProfile>;
}

export class DataZoneEnvironmentStack extends cdk.Stack {
  public envMap: Map<string, datazone.CfnEnvironment>;

  constructor(scope: Construct, id: string, props: DataZoneEnvironmentStackProps) {
    super(scope, id, props);
    this.envMap = new Map<string, datazone.CfnEnvironment>();

    for (const projectEnvConfiguration of projectEnvironmentConfigs) {
      const projectName = projectEnvConfiguration.projectName;
      const project = props.projectMap.get(projectName);
      if (project == undefined) {
        throw new Error('Configuration not present for project ' + projectName);
      }
      const projectId = project?.attrId;

      const envProfiles = projectEnvConfiguration.environmentProfiles;
      for (const envProfile of envProfiles) {
        const environmentProfileName = envProfile.EnvironmentProfileName;
        const envProfileMapKey = getEnvProfileMapKey(projectName, environmentProfileName);
        const environmentProfile = props.envProfileMap.get(envProfileMapKey);
        if (environmentProfile == undefined) {
          throw new Error('Configuration not present for environmentProfile ' + environmentProfileName + 'in project ' + projectName);
        }
        const environmentProfileId = environmentProfile?.attrId;

        for (const env of envProfile.Environments) {
          const envName = env.EnvironmentName;
          const envResourceId = envProfileMapKey + '#' + envName;
          const envResource = new aws_datazone.CfnEnvironment(this, envResourceId, {
            description: env.Description,
            domainIdentifier: props.domainId,
            environmentProfileIdentifier: environmentProfileId,
            name: envName,
            projectIdentifier: projectId,
          });

          const envId = envResource.attrId;

          const environmentKey = getEnvironmentMapKey(projectName, envName);
          if (this.envMap.get(environmentKey) != undefined) {
            throw new Error('Duplicate configurations present for environment ' + envName + 'in project ' + projectName);
          } else {
            this.envMap.set(environmentKey, envResource);
          }
        }
      }

    }

  }

}
