module.exports = {
	user: { // Dashboard user
		username: "",
		password: "",
		org_id: "", // enterprise org id
		free_org_id: "" // developer org id
	},
	another_user: { // real user which isn't the user above
		guid: "",
		user_id: ""
	},
	auth_token: "", // x-auth token
	gmail: { // gmail account linked to the first dashboard user
		email: "",
		password: ""
	},
	twilio: { // twilio account info for receiving sms from dashboard
		account_sid: "",
		auth_token: ""
	},
	environment: { // environment for testing in
		baseurl: "",
		isProduction: false,
		supportUntrusted: true
	},
	apps: {
		numberOfApps: 2, // number of apps in the enterprise org
		enterprise: { // an app in the enterprise org
			app_name: "",
			app_id: "",
			app_guid: ""
		},
		developer: { // an app in the developer org
			app_name: "",
			app_id: "",
			app_guid: ""
		}
	}
};