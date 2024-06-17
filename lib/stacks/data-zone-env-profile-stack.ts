// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from 'aws-cdk-lib';
import { aws_datazone } from 'aws-cdk-lib';
import * as datazone from 'aws-cdk-lib/aws-datazone';
import { Construct } from 'constructs';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import projectEnvironmentConfigs = require('../config/project_environment_config.json');
import { getEnvProfileMapKey } from '../helper/common';

export interface DataZoneEnvProfileStackProps extends cdk.StackProps {
  readonly domainId: string;
  readonly defaultDataLakeBlueprintId: string;
  readonly defaultDataWarehouseBlueprintId: string;
  readonly projectMap: Map<string, datazone.CfnProject>;
}

export class DataZoneEnvProfileStack extends cdk.Stack {
  public envProfileMap: Map<string, datazone.CfnEnvironmentProfile>;

  constructor(scope: Construct, id: string, props: DataZoneEnvProfileStackProps) {
    super(scope, id, props);
    this.envProfileMap = new Map<string, datazone.CfnEnvironmentProfile>();

    function getEnvironmentBlueprintId(environmentBlueprintIdentifier: any) {
      switch (environmentBlueprintIdentifier) {
        case 'DefaultDataLake':
          return props.defaultDataLakeBlueprintId;
        case 'DefaultDataWarehouse':
          return props.defaultDataWarehouseBlueprintId;
        default:
          throw Error('Invalid environmentBlueprintIdentifier passed ' + environmentBlueprintIdentifier);
      }
    }

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
        const envProfileResourceId = projectName + '#' + environmentProfileName;
        const envProfileResource = new aws_datazone.CfnEnvironmentProfile(this, envProfileResourceId, {
          awsAccountId: envProfile.AwsAccountId,
          awsAccountRegion: envProfile.AwsAccountRegion,
          description: envProfile.Description,
          domainIdentifier: props.domainId,
          environmentBlueprintIdentifier: getEnvironmentBlueprintId(envProfile.EnvironmentBlueprintIdentifier),
          name: environmentProfileName,
          projectIdentifier: projectId,
        });

        const envProfileKey = getEnvProfileMapKey(projectName, environmentProfileName);
        if (this.envProfileMap.get(envProfileKey) != undefined) {
          throw new Error('Duplicate configurations present for environment profile ' + environmentProfileName + 'in project ' + projectName);
        } else {
          this.envProfileMap.set(envProfileKey, envProfileResource);
        }

      }

    }

  }

}
