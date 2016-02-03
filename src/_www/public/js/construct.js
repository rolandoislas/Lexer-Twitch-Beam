!function() {
	$(document).ready(function() {
		addEvents();
	});
	
	function addEvents() {
		$("#createGameButton").click(createGame);
	}
	
	function createGame() {
		var url = "/";
		url += $("#autoMatchCheckbox").is(":checked") ? "random/" : "create/";
		url += $("#playersAmountSelect").val() + "/";
		if (!$("#autoMatchCheckbox").is(":checked"))
			$.ajax({
				type: "GET",
				dataType:"json",
				url: "/ajax/getId",
				success: function(data){
					window.location = url + data.id;
				}  
			});
		else
			window.location = url;
	}
}();