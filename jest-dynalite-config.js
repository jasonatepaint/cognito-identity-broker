module.exports = {
  "tables": [
    {
      "AttributeDefinitions": [
        {
          "AttributeName": "code",
          "AttributeType": "S"
        }
      ],
      "DeletionProtectionEnabled": true,
      "KeySchema": [
        {
          "KeyType": "HASH",
          "AttributeName": "code"
        }
      ],
      "ProvisionedThroughput": {
        "ReadCapacityUnits": 1,
        "WriteCapacityUnits": 1
      },
      "StreamSpecification": {
        "StreamViewType": "NEW_AND_OLD_IMAGES",
        "StreamEnabled": true
      },
      "TableName": "grants",
      "GlobalSecondaryIndexes": null
    }
  ],
  "basePort": 8000
};
