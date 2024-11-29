const { ProxyAgent } = require('undici');

const url = 'https://ipv4.icanhazip.com';
const client = new ProxyAgent(
	'http://:wQY7eiXxbK6fArPI:Ms2VvidBLZLaiK7p@_streaming-1@geo.iproyal.com:12321'
);
const proxyTest = async () => {
	try {
		const response = await fetch(url, {
			dispatcher: client,
		});

		const data = await response.text();
		console.log(data);
	} catch (error) {
		console.error(error);
	}
};

proxyTest();