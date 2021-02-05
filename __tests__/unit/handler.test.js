/* eslint-env jest */

// Import all functions from get-all-items.js
const lambda = require('../../src/handler');

// Import dynamodb from aws-sdk
const dynamodb = require('aws-sdk/clients/dynamodb');

// Import service class
const service = require('../../src/service');

// This includes all tests for apiHandler()
describe('Test apiHandler', () => {
  let getSpy, putSpy, route53Spy;

  // Test one-time setup and teardown, see more in https://jestjs.io/docs/en/setup-teardown
  beforeAll(() => {
    // Mock dynamodb get and put methods
    // https://jestjs.io/docs/en/jest-object.html#jestspyonobject-methodname
    getSpy = jest.spyOn(dynamodb.DocumentClient.prototype, 'get');
    putSpy = jest.spyOn(dynamodb.DocumentClient.prototype, 'put');
    route53Spy = jest.spyOn(service.route53, 'changeResourceRecordSets');
  });

  // Clean up mocks
  afterAll(() => {
    getSpy.mockRestore();
    putSpy.mockRestore();
    route53Spy.mockRestore();
  });

  it('should add dns record', async () => {
    // GetSpy
    // 1 - Retrieve API Key
    // 2 - Get DNS Record from DB (empty)
    // 3 - Get DNS Record from DB (empty)
    getSpy
      .mockReturnValueOnce({
        promise: () => Promise.resolve({ Item: { apiKey: 'Test123123', regex: '^[^.]+[.][^.]+[.][^.]+$' } })
      })
      .mockReturnValueOnce({
        promise: () => Promise.resolve({})
      })
      .mockReturnValueOnce({
        promise: () => Promise.resolve({})
      });

    // putSpy - Create DNS record
    putSpy.mockReturnValue({
      promise: () => Promise.resolve({})
    });

    // route53Spy - Mock return of route53 call
    route53Spy.mockReturnValue({
      promise: () => Promise.resolve('Action: CREATE - abc.test.com')
    });

    const event = {
      httpMethod: 'POST',
      body: `{
                "Action": "CREATE",
                "ResourceRecordSet": {
                    "Name": "abc.test.com",
                    "ResourceRecords": [
                        {
                            "Value": "8.8.8.8"
                        }
                    ],
                    "TTL": 300,
                    "Type": "A"
                }
            }`,
      headers: { 'x-api-key': 'Test123123' }
    };

    // Invoke putItemHandler()
    const result = await lambda.apiHandler(event);

    const expectedResult = {
      statusCode: 200,
      body: JSON.stringify('Action: CREATE - abc.test.com')
    };

    // Compare the result with the expected result
    expect(result.body).toEqual(expectedResult.body);
  });

  it('should NOT add dns record (record exists already)', async () => {
    // GetSpy
    // 1 - Retrieve API Key
    // 2 - Get DNS Record from DB (empty)
    // 3 - Get DNS Record from DB (empty)
    getSpy
      .mockReturnValueOnce({
        promise: () => Promise.resolve({ Item: { apiKey: 'Test123123', regex: '^[^.]+[.][^.]+[.][^.]+$' } })
      })
      .mockReturnValueOnce({
        promise: () => Promise.resolve({ Item: { name: 'abc.test.com', deleted: false } })
      });

    const event = {
      httpMethod: 'POST',
      body: `{
                "Action": "CREATE",
                "ResourceRecordSet": {
                    "Name": "abc.test.com",
                    "ResourceRecords": [
                        {
                            "Value": "8.8.8.8"
                        }
                    ],
                    "TTL": 300,
                    "Type": "A"
                }
            }`,
      headers: { 'x-api-key': 'Test123123' }
    };

    // Invoke putItemHandler()
    const result = await lambda.apiHandler(event);

    const expectedResult = {
      statusCode: 500,
      body: JSON.stringify('DNS Record "abc.test.com" exists already.')
    };

    // Compare the result with the expected result
    expect(result.body).toEqual(expectedResult.body);
  });

  it('should upsert dns record', async () => {
    // GetSpy
    // 1 - Retrieve API Key
    getSpy
      .mockReturnValueOnce({
        promise: () => Promise.resolve({ Item: { apiKey: 'Test123123', regex: '^[^.]+[.][^.]+[.][^.]+$' } })
      });

    // putSpy - Upsert DNS record
    putSpy.mockReturnValue({
      promise: () => Promise.resolve({})
    });

    // route53Spy - Mock return of route53 call
    route53Spy.mockReturnValue({
      promise: () => Promise.resolve('Action: UPSERT - abc.test.com')
    });

    const event = {
      httpMethod: 'POST',
      body: `{
                "Action": "UPSERT",
                "ResourceRecordSet": {
                    "Name": "abc.test.com",
                    "ResourceRecords": [
                        {
                            "Value": "8.8.8.8"
                        }
                    ],
                    "TTL": 300,
                    "Type": "A"
                }
            }`,
      headers: { 'x-api-key': 'Test123123' }
    };

    // Invoke putItemHandler()
    const result = await lambda.apiHandler(event);

    const expectedResult = {
      statusCode: 200,
      body: JSON.stringify('Action: UPSERT - abc.test.com')
    };

    // Compare the result with the expected result
    expect(result.body).toEqual(expectedResult.body);
  });

  it('should delete dns record', async () => {
    // GetSpy
    // 1 - Retrieve API Key
    // 2 - Get DNS Record from DB (record to be deleted)
    // 3 - Get DNS Record from DB (record to be deleted)
    getSpy
      .mockReturnValueOnce({
        promise: () => Promise.resolve({ Item: { apiKey: 'Test123123', regex: '^[^.]+[.][^.]+[.][^.]+$' } })
      })
      .mockReturnValueOnce({
        promise: () => Promise.resolve({ Item: { name: 'abc.test.com', deleted: false } })
      })
      .mockReturnValueOnce({
        promise: () => Promise.resolve({ Item: { name: 'abc.test.com', deleted: false } })
      });

    // putSpy - Delete DNS record
    putSpy.mockReturnValue({
      promise: () => Promise.resolve({})
    });

    // route53Spy - Mock return of route53 call
    route53Spy.mockReturnValue({
      promise: () => Promise.resolve('Action: DELETE - abc.test.com')
    });

    const event = {
      httpMethod: 'POST',
      body: `{
                "Action": "DELETE",
                "ResourceRecordSet": {
                    "Name": "abc.test.com",
                    "ResourceRecords": [
                        {
                            "Value": "8.8.8.8"
                        }
                    ],
                    "TTL": 300,
                    "Type": "A"
                }
            }`,
      headers: { 'x-api-key': 'Test123123' }
    };

    // Invoke putItemHandler()
    const result = await lambda.apiHandler(event);

    const expectedResult = {
      statusCode: 200,
      body: JSON.stringify('Action: DELETE - abc.test.com')
    };

    // Compare the result with the expected result
    expect(result.body).toEqual(expectedResult.body);
  });

  it('should NOT delete dns record (record not found)', async () => {
    // GetSpy
    // 1 - Retrieve API Key
    // 2 - Get DNS Record from DB (empty)
    // 3 - Get DNS Record from DB (empty)
    getSpy
      .mockReturnValueOnce({
        promise: () => Promise.resolve({ Item: { apiKey: 'Test123123', regex: '^[^.]+[.][^.]+[.][^.]+$' } })
      })
      .mockReturnValueOnce({
        promise: () => Promise.resolve({})
      });

    const event = {
      httpMethod: 'POST',
      body: `{
                "Action": "DELETE",
                "ResourceRecordSet": {
                    "Name": "abc.test.com",
                    "ResourceRecords": [
                        {
                            "Value": "8.8.8.8"
                        }
                    ],
                    "TTL": 300,
                    "Type": "A"
                }
            }`,
      headers: { 'x-api-key': 'Test123123' }
    };

    // Invoke putItemHandler()
    const result = await lambda.apiHandler(event);

    const expectedResult = {
      statusCode: 500,
      body: JSON.stringify('DNS Record "abc.test.com" not found.')
    };

    // Compare the result with the expected result
    expect(result.body).toEqual(expectedResult.body);
  });

  it('should NOT delete dns record (record already deleted)', async () => {
    // GetSpy
    // 1 - Retrieve API Key
    // 2 - Get DNS Record from DB (empty)
    // 3 - Get DNS Record from DB (empty)
    getSpy
      .mockReturnValueOnce({
        promise: () => Promise.resolve({ Item: { apiKey: 'Test123123', regex: '^[^.]+[.][^.]+[.][^.]+$' } })
      })
      .mockReturnValueOnce({
        promise: () => Promise.resolve({ Item: { name: 'abc.test.com', deleted: true } })
      });

    const event = {
      httpMethod: 'POST',
      body: `{
                "Action": "DELETE",
                "ResourceRecordSet": {
                    "Name": "abc.test.com",
                    "ResourceRecords": [
                        {
                            "Value": "8.8.8.8"
                        }
                    ],
                    "TTL": 300,
                    "Type": "A"
                }
            }`,
      headers: { 'x-api-key': 'Test123123' }
    };

    // Invoke putItemHandler()
    const result = await lambda.apiHandler(event);

    const expectedResult = {
      statusCode: 500,
      body: JSON.stringify('DNS Record "abc.test.com" already deleted.')
    };

    // Compare the result with the expected result
    expect(result.body).toEqual(expectedResult.body);
  });
});

// This includes all tests for getAllDnsRecordsHandler()
describe('Test getAllDnsRecordsHandler', () => {
  let scanSpy;

  // Test one-time setup and teardown, see more in https://jestjs.io/docs/en/setup-teardown
  beforeAll(() => {
    // Mock dynamodb get and put methods
    // https://jestjs.io/docs/en/jest-object.html#jestspyonobject-methodname
    scanSpy = jest.spyOn(dynamodb.DocumentClient.prototype, 'scan');
  });

  // Clean up mocks
  afterAll(() => {
    scanSpy.mockRestore();
  });

  it('should return dns records', async () => {
    const items = [{ name: 'abc.test.com', createdAt: 1612519042475, deleted: false }, { name: 'def.test.com', createdAt: 1612519042475, deleted: false }];

    // Return the specified value whenever the spied scan function is called
    scanSpy.mockReturnValue({
      promise: () => Promise.resolve({ Items: items })
    });

    const event = {
      httpMethod: 'GET'
    };

    // Invoke helloFromLambdaHandler()
    const result = await lambda.getAllDnsRecordsHandler(event);

    const expectedResult = {
      statusCode: 200,
      body: JSON.stringify(items)
    };

    // Compare the result with the expected result
    expect(result).toEqual(expectedResult);
  });
});
