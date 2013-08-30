Package.describe({
	summary: "Blade - HTML Template Compiler, inspired by Jade & Haml"
});

Package._transitional_registerBuildPlugin({
	name: "compileBlade",
	use: [],
	sources: ['compileBlade.js'],
	npmDependencies: {"blade": "3.2.6"}
});

Package.on_use(function(api) {
	api.use(['spark', 'deps'], 'client');
	//The plain-old Blade runtime
	api.add_files('runtime.js', 'client');
	//The Blade runtime with overridden loadTemplate function, designed for Meteor
	api.add_files('runtime-meteor.js', 'client');
});
