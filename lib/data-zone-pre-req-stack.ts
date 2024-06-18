// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import path from 'path';
import * as cdk from 'aws-cdk-lib';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import {
  AnyPrincipal,
  ArnPrincipal,
  CompositePrincipal,
  Effect, IRole,
  ManagedPolicy,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Tracing } from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { CUSTOM_RESOURCE_LAMBDA_ROLE_ARN, DOMAIN_KMS_KEY_NAME } from './constants';

export class DataZonePreReqStack extends cdk.Stack {

  customResourceLambdaRole: IRole;
  public projectMembershipCustomResource: Provider;
  public domainExecutionRole: Role;
  public domainKMSKey: Key;
  public glossaryCustomResource: Provider;
  public formCustomResource: Provider;
  public dzProvisioningRole: Role;
  public glueManageAccessRole: Role;
  public s3BucketForDataLake: string;
  public glossaryTermCustomResource: Provider;

  private readonly customResourceProviderRole: Role;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Required for creating domain
    this.domainExecutionRole = this.createDomainExecutionRole();
    this.domainKMSKey = this.createDomainKMSKey();

    // Required for Enabling Data Lake Blueprint Configuration
    const s3Bucket = this.createS3Bucket();
    this.s3BucketForDataLake = 's3://' + s3Bucket.bucketName;
    this.dzProvisioningRole = this.createDZProvisioningRole();
    this.glueManageAccessRole = this.createGlueManageAccessRole('DZGlueManageAccessRoleForCDK');

    // Creates Custom roles
    this.customResourceLambdaRole = this.getCustomResourceLambdaRole();
    this.customResourceProviderRole = this.createCustomResourceProviderRole();

    // Creates Custom Lambdas For Resources
    this.glossaryCustomResource = this.createGlossaryCustomResource();
    this.formCustomResource = this.createFormCustomResource();
    this.glossaryTermCustomResource = this.createGlossaryTermCustomResource();
  }

  // Create Datazone Domain creation Iam role -
  // See https://docs.aws.amazon.com/datazone/latest/userguide/create-domain.html

  private createDomainExecutionRole() {
    const role = new Role(this, 'DomainExecutionRoleForCDK', {
      roleName: 'DomainExecutionRoleForCDK',
      assumedBy: new CompositePrincipal(
        new ServicePrincipal('cloudformation.amazonaws.com'),
      ),
      inlinePolicies: {
        DomainExecutionRolePolicy: new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: [
                'datazone:*',
                'ram:GetResourceShareAssociations',
                'sso:CreateManagedApplicationInstance',
                'sso:DeleteManagedApplicationInstance',
                'sso:PutApplicationAssignmentConfiguration',
                'kms:Decrypt',
                'kms:DescribeKey',
                'kms:GenerateDataKey',
              ],
              effect: Effect.ALLOW,
              resources: ['*'],
            }),
          ],
        }),
      },
    });


    const dataZoneAssumeRoleStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      principals: [new ServicePrincipal('datazone.amazonaws.com')],
      actions: ['sts:AssumeRole', 'sts:TagSession'],
      conditions: {
        'StringEquals': {
          'aws:SourceAccount': this.account,
        },
        'ForAllValues:StringLike': {
          'aws:TagKeys': 'datazone*',
        },
      },
    });
    role.assumeRolePolicy?.addStatements(dataZoneAssumeRoleStatement);
    return role;
  }

  private createDomainKMSKey() {
    return new Key(this, DOMAIN_KMS_KEY_NAME, {
      description: 'A key to use in contract tests for creating domain',
      alias: DOMAIN_KMS_KEY_NAME,
      enableKeyRotation: true,
      enabled: true,
      policy: this.createKeyPolicy(),
    });
  }

  private createKeyPolicy(): PolicyDocument {
    const accountId = this.account;
    const adminPolicy = new PolicyStatement({
      sid: 'KmsKeyAdminAccess',
      actions: ['kms:*'],
      effect: Effect.ALLOW,
      principals: [
        new ArnPrincipal(`arn:aws:iam::${accountId}:root`),
      ],
      resources: ['*'],
    });

    const keyUsePolicy = new PolicyStatement({
      sid: 'KmsKeyUseAccess',
      actions: [
        'kms:Encrypt',
        'kms:Decrypt',
        'kms:ReEncrypt*',
        'kms:GenerateDataKey*',
        'kms:DescribeKey',
        'kms:CreateGrant',
        'kms:ListGrants',
        'kms:RevokeGrant',
      ],
      effect: Effect.ALLOW,
      principals: [new AnyPrincipal()],
      resources: ['*'],
      conditions: {
        StringEquals: {
          'kms:CallerAccount': accountId,
        },
      },
    });

    return new PolicyDocument({
      statements: [adminPolicy, keyUsePolicy],
    });
  }

  private createGlossaryCustomResource() {
    const resourceName = 'Glossary';
    const resourceHandler = 'glossaries.handler';
    return this.createCustomResourceProvider(resourceName, resourceHandler);
  }

  private getCommonLambdaProperties() {
    const commonLambdaProperties = {
      role: this.customResourceLambdaRole,
      memorySize: 1024,
      timeout: Duration.minutes(15),
      runtime: lambda.Runtime.PYTHON_3_12,
      tracing: Tracing.ACTIVE,
      currentVersionOptions: {
        removalPolicy: RemovalPolicy.DESTROY,
      },
    };
    return commonLambdaProperties;
  }

  private getCustomResourceLambdaRole() {
    return Role.fromRoleArn(this, 'DZCustomResourceLambdaRoleARN', CUSTOM_RESOURCE_LAMBDA_ROLE_ARN);
  }

  private createCustomResourceProvider(resourceName: string, resourceHandler: string) {
    const lambdaProperties = this.getCommonLambdaProperties();
    const lambdaFunction = new lambda.Function(this, resourceName + 'Lambda', {
      code: lambda.Code.fromAsset(path.join(__dirname, '/resources')),
      handler: resourceHandler,
      ...lambdaProperties,
    });

    const customResourceProvider = new cr.Provider(this, resourceName + 'CR', {
      logGroup: new LogGroup(this, resourceName + 'CRLogs', { retention: RetentionDays.ONE_DAY }),
      role: this.customResourceProviderRole,
      onEventHandler: lambdaFunction,
    });

    return customResourceProvider;
  }

  private createCustomResourceProviderRole() {
    return new Role(this, 'CustomResourceProviderRole', {
      roleName: 'CustomResourceProviderRole1',
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess')],
    });
  }

  private createDZProvisioningRole() {
    const assumeRolePrincipals = this.getDZProvisioningRolePrincipal(this.account);
    const compositePrincipal = new CompositePrincipal(...assumeRolePrincipals);

    return new Role(this, 'DZProvisioningRoleForCDK', {
      roleName: 'DZProvisioningRoleForCDK',
      assumedBy: compositePrincipal,
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('AmazonDataZoneRedshiftGlueProvisioningPolicy'),
        ManagedPolicy.fromAwsManagedPolicyName('AWSGlueConsoleFullAccess'),
      ],
    });
  }

  private getDZProvisioningRolePrincipal(accountId: string) {
    return [
      new ServicePrincipal('datazone.amazonaws.com').withConditions({
        StringEquals: {
          'aws:SourceAccount': accountId,
        },
      }),
      new ServicePrincipal('cloudformation.amazonaws.com').withConditions({
        StringEquals: {
          'aws:SourceAccount': accountId,
        },
      }),
    ];
  }

  private createGlueManageAccessRole(roleName: string) {
    return new Role(this, roleName, {
      roleName: roleName,
      assumedBy: new CompositePrincipal(
        new ServicePrincipal('datazone.amazonaws.com'),
        new ServicePrincipal('cloudformation.amazonaws.com'),
      ),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonDataZoneGlueManageAccessRolePolicy'),
      ],
    });
  }

  private createS3Bucket() {
    return new Bucket(this, 'DZTestInfraBucket', {
      encryption: BucketEncryption.S3_MANAGED,
      bucketName: `datazone-s3-${this.account}-${this.region}`,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [
        {
          enabled: true,
          expiration: Duration.days(365),
          id: 'ExpireAfterOneYear',
        },
      ],
    });
  }

  private createFormCustomResource() {
    const resourceName = 'Form';
    const resourceHandler = 'create_form.handler';
    return this.createCustomResourceProvider(resourceName, resourceHandler);
  }

  private createGlossaryTermCustomResource() {
    const resourceName = 'GlossaryTerm';
    const resourceHandler = 'glossary_terms.handler';
    return this.createCustomResourceProvider(resourceName, resourceHandler);
  }
}