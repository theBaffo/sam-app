const Joi = require('joi');
const Service = require('./service');

const validateInput = async (body, headers) => {
  const schema = Joi.object().keys({
    body: Joi.object().keys({
      Action: Joi.string().required().valid('CREATE', 'UPSERT', 'DELETE'),
      ResourceRecordSet: Joi.object().keys({
        Name: Joi.string().required()
      }).unknown().required()
    }),
    headers: Joi.object().keys({
      'x-api-key': Joi.string().required()
    })
  });

  ({ body, headers } = Joi.attempt({ body, headers }, schema));

  // Return values bundled together
  return { params: body, ApiKey: headers['x-api-key'] };
};

exports.apiHandler = async (event) => {
  console.info('received:', event);

  try {
    // Need to check both 'X-Api-Key' and 'x-api-key'
    // because of different behaviour of SAM Local vs SAM
    const body = JSON.parse(event.body);
    const headers = { 'x-api-key': event.headers['X-Api-Key'] || event.headers['x-api-key'] || '' };

    // Validate and retrieve input
    const { params, ApiKey } = await validateInput(body, headers);

    // Add HostedZoneId from process.env
    params.HostedZoneId = process.env.HOSTED_ZONE_ID || '';

    // Process request
    let result = {};

    switch (params.Action) {
      case 'CREATE':
        result = await Service.createDNS({ ...params, ApiKey });
        break;
      case 'UPSERT':
        result = await Service.upsertDNS({ ...params, ApiKey });
        break;
      case 'DELETE':
        result = await Service.deleteDNS({ ...params, ApiKey });
        break;
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (error) {
    const statusCode = (error.isJoi) ? 400 : 500;

    return {
      statusCode: statusCode,
      body: JSON.stringify(error.message)
    };
  }
};

exports.getAllDnsRecordsHandler = async (event) => {
  // All log statements are written to CloudWatch
  console.info('received:', event);

  const items = await Service.getDnsRecords();

  const response = {
    statusCode: 200,
    body: JSON.stringify(items)
  };

  return response;
};
