const AWS = require('aws-sdk');

// Exports for testing purpouse
exports.route53 = new AWS.Route53();

const DB = require('./db');

const validateRegex = (name, regex) => {
  const matches = name.match(regex);

  if (!matches || matches.length === 0) {
    throw new Error(`"${name}" does not match regex "${regex}"`);
  }
};

const _changeResourceDNS = async ({ Action, ResourceRecordSet, HostedZoneId }) => {
  let result;

  try {
    result = await this.route53
      .changeResourceRecordSets({
        ChangeBatch: {
          Changes: [
            {
              Action,
              ResourceRecordSet
            }
          ]
        },
        HostedZoneId
      })
      .promise();

    console.info('Route53 result', result);

    // Return string describing the changes made
    return `Action: ${Action} - ${ResourceRecordSet.Name}`;
  } catch (error) {
    // Throw Route53 error, to be catched above
    console.error('Route53 error', error);
    throw new Error(`Route53 error: "${error.message}`);
  }
};

exports.createDNS = async ({ Action, ResourceRecordSet, HostedZoneId, ApiKey }) => {
  try {
    const name = ResourceRecordSet.Name;
    const user = await DB.getUser(ApiKey);

    // Validate regex
    validateRegex(name, user.regex);

    // Get DNS Record
    const record = await DB.getDnsRecord(name);

    if (record && !record.deleted) {
      throw new Error(`DNS Record "${name}" exists already.`);
    }

    // Perform DNS Change
    const result = _changeResourceDNS({ Action, ResourceRecordSet, HostedZoneId });

    // Create DNS Record
    await DB.createDnsRecord(name);

    // Return result from DNS Change
    return result;
  } catch (error) {
    throw new Error(error.message);
  }
};

exports.upsertDNS = async ({ Action, ResourceRecordSet, HostedZoneId, ApiKey }) => {
  try {
    const name = ResourceRecordSet.Name;
    const user = await DB.getUser(ApiKey);

    // Validate regex
    validateRegex(name, user.regex);

    // Perform DNS Change
    const result = _changeResourceDNS({ Action, ResourceRecordSet, HostedZoneId });

    // Upsert DNS Record
    await DB.upsertDnsRecord(name);

    // Return result from DNS Change
    return result;
  } catch (error) {
    // TODO: Handle DB / Route53 error
    throw new Error(error.message);
  }
};

exports.deleteDNS = async ({ Action, ResourceRecordSet, HostedZoneId, ApiKey }) => {
  try {
    const name = ResourceRecordSet.Name;
    const user = await DB.getUser(ApiKey);

    // Validate regex
    validateRegex(name, user.regex);

    // Get DNS Record
    const record = await DB.getDnsRecord(name);

    if (!record) {
      throw new Error(`DNS Record "${name}" not found.`);
    } else if (record.deleted) {
      throw new Error(`DNS Record "${name}" already deleted.`);
    }

    // Perform DNS Change
    const result = _changeResourceDNS({ Action, ResourceRecordSet, HostedZoneId });

    // Delete DNS Record
    await DB.deleteDnsRecord(name);

    // Return result from DNS Change
    return result;
  } catch (error) {
    // TODO: Handle DB / Route53 error
    throw new Error(error.message);
  }
};

exports.getDnsRecords = async () => {
  return DB.getDnsRecords();
};
