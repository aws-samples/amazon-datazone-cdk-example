# Amazon DataZone CDK Example

An example CDK app demonstrating how CDK can be utilized to create Amazon DataZone Resources.
In addition to the publicly available DZ Resources ([Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/AWS_DataZone.html)), this package also includes custom code to allow creation of:

1. Project Memberships
2. Glossaries
3. Glossary Terms
4. Metadata Forms

#### Current capabilities

The CDK application currently supports:

1. Creating a domain.
2. Enabling Blueprints for the Data Lake and Data Warehouse.
3. Creating projects for the domain and adding project members to the same.
4. Creating Glossary and Glossary Terms for the project. Adding **TermRelations** is **Not Supported** currently
as the same can be between glossary terms for multiple projects as well. So, the ideal product experience needs to be
figured out for the same.
5. Creating Metadata Forms for the project.
6. Creating Environment Profiles and Environments.
7. Creating Data Sources for the environments.

## Pre-requisite

### Local environment requirements

You need to have the following dependencies in place:

* An [AWS account](https://signin.aws.amazon.com/signin?redirect_uri=https%3A%2F%2Fportal.aws.amazon.com%2Fbilling%2Fsignup%2Fresume&client_id=signup) (with Amazon IAM Identity Center enabled)
* Bash/ZSH/[WSL2](https://learn.microsoft.com/en-us/windows/wsl/install-manual#step-2---check-requirements-for-running-wsl-2)

* AWS credentials and profiles for each environment under ~/.aws/config [here](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html)
  * You must export `AWS_PROFILE` and `AWS_REGION` containing the AWS Account credentials where you will deploy Amazon DataZone to. This is necessary to be present before performing any infrastructure deployment via AWS CDK below.

* Python version >= 3.12
* AWS SDK for Python >= 1.34.87
* Node >= v18.18.*
* NPM >= v10.2.*

Next step is to install all the required npm dependencies for CDK

```bash
npm ci ### it installs the frozen dependencies from package-lock.json
```

### Bootstrap

Use `npm run cdk bootstrap -- --region ${AWS_REGION} --profile ${AWS_PROFILE}` command to do initial bootstraping of the AWS Account

### Please make sure the IAM role for CDK deployment starting with " cdk-cfn-xxxxxx-exec-role-" is an administrator Data Lake administrator in AWS Lakeformation

![alt text](<image-3.png>)

### Local configuration adjustments

Now that you have installed all the required dependencies locally and done the initial AWS Account bootstraping you need to pay attention to the following steps as those will help you with the deployment phase. Please keep the order as this is important.

#### 0. Preparation

Run the `scripts/prepare.sh` and provide the AWS_ACCOUNT_ID and the AWS_REGION (same as the one used for the AWS CDK commands above) which will then be replaced in the following files:

* `lib/config/project_config.json`
* `lib/config/project_environment_config.json`
* `lib/constants.ts`
This step is mandatory for single account deployment.

#### 1. Lambda Custom Resource adjustments

Make sure to check the `CUSTOM_RESOURCE_LAMBDA_ROLE_ARN` (under [constants.ts](lib%2Fconstants.ts)) to the role that you would use for deploying the CDK. This is a **necessary step** for creating the custom resource. By default, CDK uses the role  created during bootstrapping and can be found in the CFN Stack with name `CDKToolkit` with Logical ID being `CloudFormationExecutionRole` .

Update the CDK Role's trust relationship in the AWS Account where you will be deploying the solution and add the following permissions to it:

```agsl
    {
        "Effect": "Allow",
        "Principal": {
            "Service": "lambda.amazonaws.com"
        },
        "Action": "sts:AssumeRole",
        "Condition": {
            "ArnLike": {
                "aws:SourceArn": [
                    "arn:aws:lambda:${REGION}:{ACCOUNT_ID}:function:DataZonePreqStack-GlossaryLambda*",
                    "arn:aws:lambda:${REGION}:{ACCOUNT_ID}:function:DataZonePreqStack-GlossaryTermLambda*",
                    "arn:aws:lambda:${REGION}:{ACCOUNT_ID}:function:DataZonePreqStack-FormLambda*"
                ]
            }
        }
    }
```

Make sure to replace `${ACCOUNT_ID}` and `${REGION}` to the account/region specific ones.
This is important for the Glossary/GlossaryTerm/Form Lambdas which assume the `cdk-hnb659fds-cfn-exec-role-${ACCOUNT_ID}-${REGION}`  to perform those actions. (There we use the default CDK Qualifier which then adds the `hnb659fds` to the name, the idea is the execution role is defined in the `CUSTOM_RESOURCE_LAMBDA_ROLE_ARN` and the trust relationship has to be updated on that particular role which is used).
This would enable the Custom Resources to use the CDK Role and perform the desired operations. Without this replacement the CDK Execution role cannot be assumed by the Custom Resource Lambdas to perform the functionalities mentioned above.

#### 2. Amazon DataZone configurations

The following custom configurations are currently supported:

1. **Domain**

   1. Name can be updated by updating the `DOMAIN_NAME` (under [constants.ts](lib%2Fconstants.ts)).
   2. SSO Configuration for domain can be enabled by updating the `SHOULD_ENABLE_SSO_FOR_DOMAIN` (under [constants.ts](lib%2Fconstants.ts)).

**NOTE** - If you want to use a different `DOMAIN_EXECUTION_ROLE_NAME` or `KMS Key Name`  for setting up domain then the same can be updated in [constants.ts](lib%2Fconstants.ts)).

2. **Environment Profiles, Environments and Data Sources**
    Please update  [project_enviornment_config.json] as follows-->
    1. You can create an Environment Profile for either DataLake or DataWarehouse blueprints which can be configured by the EnvironmentBlueprintIdentifier. In addition to this, you can add a Description, AWS Account and Region to which the environment should be deployed.
    2. You can add multiple environments for a single environment profile by updating the Environments field. Each environment can have a name, description, and multiple data sources.
    2. Data source name needs to be updated by updating `DATA_SOURCE_NAME_PLACEHOLDER` and the description by updating `DATA_SOURCE_DESCRIPTION_PLACEHOLDER`. Please refer to [AWS::DataZone::DataSource](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datazone-datasource.html) for the various fields that you can configure for a data source. This would create a data source for the environment. Refer [DataZone DataSource](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datazone-datasource.html) for the various fields that can be configured for a data source.
    3. Please update `EXISTING_GLUE_DB_NAME_PLACEHOLDER` with the existing AWS Glue database name. Please make sure you have at least 1 existing Glue table to publish as a data source within the Amazon Datazone. The schedule in the following code is an example to schedule the data source job run in Amazon DataZone; you can change it according to your requirements.

You can create an Environment Profile for either DataLake or DataWarehouse blueprints which can be configured by the EnvironmentBlueprintIdentifier. In addition to this, you can add a Description, AWS Account and Region to which the environment should be deployed.
   2. You can add Multiple Environments for a single Environment Profile by updating the `Environments` field. Each environment can have a Name, Description, and multiple Data Sources.

3. **Project and Project Owners**
   1. You can use [project_config.json](lib%2Fconfig%2Fproject_config.json) for creating new projects. Currently, Project Name, Description and Owner can be configured.
   2. You can also configure the administrator or owner of the project using `projectOwnerIdentifier`. This has been added as the CDK Role would be the default owner of the project, so this configuration would allow the user to have the correct entity as the Project Member.

   **NOTE** -
1. The `projectOwnerIdentifier` is the entity that you want to use as the owner of the Project. This can be any IAM Principal or any SSO Group that you would ideally want to add as an owner of the project.
2. If you want to use groups as ProjectOwner, then use `GroupIdentifier` as the `projectOwnerIdentifierType`
      else use `UserIdentifier` if you want to set the same an IAM principal or SSO User.
3. The Project Members custom resource can also be expanded to add more members to the Project.

4. **Glossaries and Glossary Terms**

   1. You can add glossaries and glossary terms to project using [project_glossary_config.json](lib%2Fconfig%2Fproject_glossary_config.json).
   2. You need to specify the Project Name under which the Glossary should be created.
   3. Each Glossary can have a Name, Description and Glossary Terms.
   4. A Glossary Terms can have a Name, ShortDescription, LongDescription.

**NOTE** -
Adding **TermRelations** is **Not Supported** currently
as the same can be between glossary terms for multiple projects as well. So, the ideal product experience needs to be
figured out for the same.

5. **Metadata Forms**
   1. You can add Metadata Forms to the project using [project_form_config.json](lib%2Fconfig%2Fproject_form_config.json).
   2. You need to specify the Project Name under which the Form should be created.
   3. A Form can have  Name, Description, and model.

   **NOTE** - Creating Metadata forms requires a stringified Smithy content for the form. You can use this smithy
              structure to create the same.

```
@amazon.datazone#displayname(defaultName: "MetaDataDisplayName")
structure MetaDataTechnicalName {
    @documentation("FieldDescription")
    @required
    @amazon.datazone#displayname(defaultName: "FieldDisplayName")
    FieldTechnicalName: Integer
}
```

where:

1. `MetaDataTechnicalName` is the name of the form being created, should be same as `formName` in [project_form_config.json](lib%2Fconfig%2Fproject_form_config.json).
2. `MetaDataDisplayName` is the display name for the form. Change `MetaDataDisplayName` to the name that you want.
3. `@documentation` is the description for the field.
4. `@required` denotes that the field is mandatory. Remove the same to make it optional.
5. `FieldDisplayName` is the display name for the field. Change `FieldDisplayName` to the name that you want.
6. `FieldTechnicalName` is the technical name of the field. It can be of any type supported by the smithy.

In addition to these, you can also use other smithy annotations like default values, range etc. for configuring the structure.

## Deployment

Now that you have all the configurations in place, from the local environment to the infrastructure as code level including Amazon DataZone you can proceed with the initial deployment by running the following command (make sure you have exported the right AWS_REGION and AWS_PROFILE as environment variables):

`npm run cdk deploy -- --all --region ${AWS_REGION} --profile ${AWS_PROFILE}`

This will take a while, please keep an eye on the cli outputs.

## Cleanup

**Note**: In case you have data already shared via Amazon DataZone or any user association and you want to destroy the entire infrastructure during cleanup phase above then you have to remove those manually first in the AWS Console as AWS CDK won't be able to automatically do that for you.

1. Please [unpublished the data within Amazon Datazone](https://docs.aws.amazon.com/datazone/latest/userguide/archive-data-asset.html) Data portal manually
2. [Delete the data asset manually from the Amazon Datazone Data portal](https://docs.aws.amazon.com/datazone/latest/userguide/delete-data-asset.html)
3. To destroy all the resources created you can run the command below.

`npm run cdk destroy -- --all --region ${AWS_REGION} --profile ${AWS_PROFILE}`

4. After that please manually delete Amazon Datazone created Glue databases in AWS Glue. Please follow this link in case you need to [troubleshoot Lake Formation permission errors in AWS Glue](https://repost.aws/knowledge-center/glue-insufficient-lakeformation-permissions)
![alt text](<image-4.png>)

5. Also remove the below IAM roles from AWS Lake Formation’s Administrative roles and tasks
![alt text](<image-5.png>)

## Playbooks

### Troubleshooting common deployment problems

* In case you get: ```"Domain name already exists under this account, please use another one (Service: DataZone, Status Code: 409, Request ID: 2d054cb0-0 fb7-466f-ae04-c53ff3c57c9a)" (RequestToken: 85ab4aa7-9e22-c7e6-8f00-80b5871e4bf7, HandlerErrorCode: AlreadyExists)``` then please change the domain name (DOMAIN_NAME) under `lib/constants.ts` and try to re-deploy again.
* In case you get: ```"Resource of type 'AWS::IAM::Role' with identifier 'CustomResourceProviderRole1' already exists." (RequestToken: 17a6384e-7b0f-03b3
-1161-198fb044464d, HandlerErrorCode: AlreadyExists)``` then this means you are accidentally trying to deploy everything in the same account but different region, please stick to the region you configured initially in your initial deploy. For the sake of simplicity the `DataZonePreReqStack` can only be deployed in one region in the same AWS account.
