// Get the DynamoDB table name from environment variables
const dnsRecordTableName = process.env.DNS_RECORD_TABLE;
const userTableName = process.env.USER_TABLE;

// Create a DocumentClient that represents the query to add an item
const dynamodb = require('aws-sdk/clients/dynamodb');
const docClient = new dynamodb.DocumentClient();

/*
Used for local testing

const docClient = new dynamodb.DocumentClient({
  endpoint: 'http://dynamodb:8000'
});
*/

/*
 * DNS Record Table
 */

exports.getDnsRecord = async (name) => {
  const params = {
    TableName: dnsRecordTableName,
    Key: { name }
  };

  const data = await docClient.get(params).promise();
  return data.Item || null;
};

exports.getDnsRecords = async () => {
  // Retrieve all records
  const params = {
    TableName: dnsRecordTableName
  };

  const data = await docClient.scan(params).promise();
  const items = data.Items || []; // .filter(item => !item.deleted);

  // Return response
  return items;
};

exports.createDnsRecord = async (name) => {
  // First, retrieve the DNS Record
  const item = await this.getDnsRecord(name);

  // If DNS Record is present (and not deleted), return error
  if (item && !item.deleted) {
    throw new Error('DNS Record already exists');
  }

  await this.upsertDnsRecord(name);
};

exports.upsertDnsRecord = async (name) => {
  const timestamp = new Date().getTime();
  const newItem = { name: name, createdAt: timestamp, deleted: false, deletedAt: null };

  const params = {
    TableName: dnsRecordTableName,
    Item: newItem
  };

  // Upsert DNS Record
  await docClient.put(params).promise();
};

exports.deleteDnsRecord = async (name) => {
  // First, retrieve the DNS Record
  const item = await this.getDnsRecord(name);

  // If not present (or "deleted"), return error
  if (!item || item.deleted) {
    throw new Error('DNS Record not found');
  }

  // Then, "delete" the record (set deleted = true)
  const timestamp = new Date().getTime();
  item.deleted = true;
  item.deletedAt = timestamp;

  const params = {
    TableName: dnsRecordTableName,
    Item: item
  };

  // "Delete" DNS Record
  await docClient.put(params).promise();
};

/*
 * User Table
 */

exports.getUser = async (apiKey) => {
  const params = {
    TableName: userTableName,
    Key: { apiKey }
  };

  const data = await docClient.get(params).promise();
  const item = data.Item || null;

  if (!item || item.deleted) {
    throw new Error('API Key not valid');
  }

  return item;
};
