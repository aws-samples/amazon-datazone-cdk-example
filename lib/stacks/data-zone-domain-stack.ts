// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from 'aws-cdk-lib';
import * as datazone from 'aws-cdk-lib/aws-datazone';
import { Role } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import { SHOULD_ENABLE_SSO_FOR_DOMAIN } from '../constants';

export interface DataZoneDomainStackProps extends cdk.StackProps {
  readonly domainExecutionRole: Role;
  readonly domainKMSKey: Key;
  readonly domainName: string;
}

export class DataZoneDomainStack extends cdk.Stack {
  public domainId: string;

  constructor(scope: Construct, id: string, props: DataZoneDomainStackProps) {
    super(scope, id, props);

    var domainProps = {
      description: 'Testing Domain For CDK',
      domainExecutionRole: props.domainExecutionRole.roleArn,
      kmsKeyIdentifier: props.domainKMSKey.keyArn,
      name: props.domainName,
      singleSignOn: SHOULD_ENABLE_SSO_FOR_DOMAIN ? {
        type: 'IAM_IDC',
        userAssignment: 'AUTOMATIC',
      } : undefined,
      tags: [{
        key: 'CDKDomainTagKey',
        value: 'CDKDomainTagValue',
      }],
    };

    const domain = new datazone.CfnDomain(this, props.domainName, domainProps);

    this.domainId = domain.attrId;
  }

}
