"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
"""

import sys
import boto3
from uuid import uuid4

def handler(event, context):
    """
    AWS Lambda function handler for managing glossaries in AWS DataZone.

    Args:
        event (dict): The Lambda event object containing the request details.
        context (obj): The Lambda context object.

    Returns:
        dict: A response dictionary with the status and additional data.
    """
    print('Received event:', event)

    domain_identifier = event['ResourceProperties'].get('DomainIdentifier', None)
    owning_project_identifier = event['ResourceProperties'].get('OwningProjectIdentifier', None)
    name = event['ResourceProperties'].get('GlossaryName', None)
    status = event['ResourceProperties'].get('GlossaryStatus', None)
    description = event['ResourceProperties'].get('GlossaryDescription', None)

    if not domain_identifier or not owning_project_identifier or not name:
        raise Exception(
            "Invalid event. "
            "Missing DomainIdentifier or ProjectIdentifier or Name."
        )

    if not status:
        print(f"Status not specified for Glossary {name} in domain {domain_identifier}, project "
              f"{owning_project_identifier}, defaulting to enabled")
        status = "ENABLED"

    if not description:
        print(f"Description not specified for Glossary {name} in domain {domain_identifier}, project "
              f"{owning_project_identifier}, defaulting to null")
        description = ""

    client = boto3.client('datazone')


    if event['RequestType'] == 'Create':
        glossary_id = create_glossary(client, domain_identifier, owning_project_identifier, name, description, status)
        response_data = {"GlossaryId": glossary_id}
        return {'status': 'SUCCESS', 'PhysicalResourceId': glossary_id, 'Data': response_data}

    elif event['RequestType'] == 'Update':
        identifier = event["PhysicalResourceId"]
        update_glossary(client, identifier, domain_identifier, name, description, status)
        response_data = {"GlossaryId": identifier}
        return {'status': 'SUCCESS', 'PhysicalResourceId': identifier, 'Data': response_data}

    elif event['RequestType'] == 'Delete':
        identifier = event["PhysicalResourceId"]
        update_glossary(client, identifier, domain_identifier, name, description, "DISABLED")
        delete_glossary(client, identifier, domain_identifier)

    return {'status': 'SUCCESS'}


def create_glossary(client, domain_identifier, owning_project_identifier, name, description, status):
    """
    Create a new glossary in AWS DataZone.

    Args:
        client (boto3.client): The AWS DataZone client.
        domain_identifier (str): The identifier of the AWS DataZone domain where the glossary should be created.
        owning_project_identifier (str): The identifier of the AWS DataZone project that owns the glossary.
        name (str): The name of the glossary.
        description (str): The description of the glossary.
        status (str): The status of the glossary, either "ENABLED" or "DISABLED".

    Returns:
        str: The identifier of the created glossary.
    """
    print(f"Creating new glossary with name {name} for domain {domain_identifier} project {owning_project_identifier}")
    create_response = client.create_glossary(
        clientToken=str(uuid4()),
        description=description,
        domainIdentifier=domain_identifier,
        name=name,
        owningProjectIdentifier=owning_project_identifier,
        status=status
    )
    glossary_id = create_response["id"]
    print(f"Successfully created new glossary with name {name} for domain {domain_identifier} project "
          f"{owning_project_identifier}, received id {glossary_id}")
    return glossary_id


def update_glossary(client, identifier, domain_identifier, name, description, status):
    """
    Update an existing glossary in AWS DataZone.

    Args:
        client (boto3.client): The AWS DataZone client.
        identifier (str): The identifier of the glossary to be updated.
        domain_identifier (str): The identifier of the AWS DataZone domain where the glossary exists.
        name (str): The new name of the glossary.
        description (str): The new description of the glossary.
        status (str): The new status of the glossary, either "ENABLED" or "DISABLED".
    """
    response = client.update_glossary(
        clientToken=str(uuid4()),
        description=description,
        domainIdentifier=domain_identifier,
        identifier=identifier,
        name=name,
        status=status
    )
    print(f"Successfully updated glossary with name {name} and id {identifier} for domain {domain_identifier}")


def delete_glossary(client, identifier, domain_identifier):
    """
    Delete an existing glossary in AWS DataZone.

    Args:
        client (boto3.client): The AWS DataZone client.
        identifier (str): The identifier of the glossary to be deleted.
        domain_identifier (str): The identifier of the AWS DataZone domain where the glossary exists.
    """
    try:
        response = client.delete_glossary(
            domainIdentifier=domain_identifier,
            identifier=identifier
        )
    except Exception as e:
        print(f"Failed to delete glossary due to {e}")
