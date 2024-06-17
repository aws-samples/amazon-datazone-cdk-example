// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from 'aws-cdk-lib';
import * as datazone from 'aws-cdk-lib/aws-datazone';
import { Role } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { DOMAIN_NAME } from '../constants';

export interface DataZoneBlueprintStackProps extends cdk.StackProps {
  readonly domainId: string;
  readonly dzProvisioningRole: Role;
  readonly glueManageAccessRole: Role;
  readonly s3BucketForDataLake: string;
}

export class DataZoneBlueprintStack extends cdk.Stack {
  public dataLakeBluePrintId: string;
  public dataWarehouseBluePrintId: string;

  constructor(scope: Construct, id: string, props: DataZoneBlueprintStackProps) {
    super(scope, id, props);

    const dataLakeBlueprintConfiguration= new datazone.CfnEnvironmentBlueprintConfiguration(this, 'DataLakeBluePrintConfigurationFor' + DOMAIN_NAME, {
      domainIdentifier: props.domainId,
      enabledRegions: [this.region],
      environmentBlueprintIdentifier: 'DefaultDataLake',
      manageAccessRoleArn: props.glueManageAccessRole.roleArn,
      provisioningRoleArn: props.dzProvisioningRole.roleArn,
      regionalParameters: [
        {
          region: this.region,
          parameters: { S3Location: props.s3BucketForDataLake },
        },
      ],
    });

    const dataWarehouseBlueprintConfiguration= new datazone.CfnEnvironmentBlueprintConfiguration(this, 'DataWarehouseBluePrintFor' + DOMAIN_NAME, {
      domainIdentifier: props.domainId,
      enabledRegions: [this.region],
      environmentBlueprintIdentifier: 'DefaultDataWarehouse',
      manageAccessRoleArn: props.glueManageAccessRole.roleArn,
      provisioningRoleArn: props.dzProvisioningRole.roleArn,
      regionalParameters: [],
    });

    this.dataLakeBluePrintId = dataLakeBlueprintConfiguration.attrEnvironmentBlueprintId;
    this.dataWarehouseBluePrintId = dataWarehouseBlueprintConfiguration.attrEnvironmentBlueprintId;
  }
}
