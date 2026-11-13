$(document).ready(function () {
    $("details.platform-resources").on("toggle", function () { $(window).trigger("resize"); });
    function updatePracticeOverview() {
        if (!document.getElementById("practice-overview")) return;
        var records = CodeQuizStorage.read("attempts", []);
        if (!Array.isArray(records)) records = [];
        records = records.filter(function (r) { return r && Number.isInteger(r.score) && Number.isInteger(r.total) && r.total > 0 && r.score >= 0 && r.score <= r.total && typeof r.topicTitle === "string" && Number.isFinite(Date.parse(r.completedAt)); });
        var full = records.filter(function (r) { return r.mode === "full"; });
        $("#practice-attempts").text(records.length);
        $("#practice-average").text(full.length ? Math.round(full.reduce(function (sum, r) { return sum + r.score / r.total; }, 0) / full.length * 100) + "%" : "—");
        $("#practice-best").text(full.length ? Math.round(Math.max.apply(null, full.map(function (r) { return r.score / r.total; })) * 100) + "%" : "—");
        $("#practice-recent").text(records.length ? "Latest: " + records[0].topicTitle + " · " + records[0].score + " / " + records[0].total + " · " + new Date(records[0].completedAt).toLocaleDateString("en-GB") + (records[0].mode === "missed" ? " · Missed questions" : "") : "Complete a quiz to see your progress here.");
    }
    updatePracticeOverview();
    $(window).on("pageshow storage codequiz:results", updatePracticeOverview);
});
