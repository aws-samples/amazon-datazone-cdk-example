// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from 'aws-cdk-lib';
import { aws_datazone } from 'aws-cdk-lib';
import * as datazone from 'aws-cdk-lib/aws-datazone';
import { Construct } from 'constructs';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import projectEnvironmentConfigs = require('../config/project_environment_config.json');
import { getEnvironmentMapKey, getEnvProfileMapKey } from '../helper/common';
import { DataSourceConfigProps } from '../types';

export interface DataZoneDataSourceStackProps extends cdk.StackProps {
  readonly domainId: string;
  readonly projectMap: Map<string, datazone.CfnProject>;
  readonly envProfileMap: Map<string, datazone.CfnEnvironmentProfile>;
  readonly envMap: Map<string, datazone.CfnEnvironment>;
}

export class DataZoneDataSourceStack extends cdk.Stack {
  public envMap: Map<string, datazone.CfnEnvironment>;

  constructor(scope: Construct, id: string, props: DataZoneDataSourceStackProps) {
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
          const environmentMapKey = getEnvironmentMapKey(projectName, envName);
          const environment = props.envMap.get(environmentMapKey);
          if (environment == undefined) {
            throw new Error('Configuration not present for environment ' + environment + 'in project ' + projectName);
          }

          const envId = environment.attrId;
          const dataSourceConfigs = env.DataSources;
          for (const dataSourceConfig of dataSourceConfigs) {
            const dataSourceName = dataSourceConfig.Name;
            const dataSourceResourceId = environmentMapKey + '#' + dataSourceName;
            const dataSourceProps: DataSourceConfigProps = {};
            if (dataSourceConfig.AssetFormsInput != undefined) {
              dataSourceProps.assetFormsInput = dataSourceConfig.AssetFormsInput;
            }

            if (dataSourceConfig.Configuration != undefined) {
              dataSourceProps.configuration = dataSourceConfig.Configuration;
            }

            if (dataSourceConfig.Description != undefined) {
              dataSourceProps.description = dataSourceConfig.Description;
            }

            if (dataSourceConfig.EnableSetting != undefined) {
              dataSourceProps.enableSetting = dataSourceConfig.EnableSetting;
            }

            if (dataSourceConfig.PublishOnImport != undefined) {
              dataSourceProps.publishOnImport = dataSourceConfig.PublishOnImport;
            }

            if (dataSourceConfig.Recommendation != undefined) {
              dataSourceProps.recommendation = dataSourceConfig.Recommendation;
            }

            if (dataSourceConfig.Schedule != undefined) {
              dataSourceProps.schedule = dataSourceConfig.Schedule;
            }

            const assetFormsInput = dataSourceConfig.AssetFormsInput;
            const dataSource = new aws_datazone.CfnDataSource(this, dataSourceResourceId, {
              domainIdentifier: props.domainId,
              environmentIdentifier: envId,
              name: dataSourceConfig.Name,
              projectIdentifier: projectId,
              type: dataSourceConfig.Type,
              ...dataSourceProps,
            });
          }
        }
      }
    }

  }

}
