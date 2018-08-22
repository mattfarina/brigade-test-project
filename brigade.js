const { events, Job } = require("brigadier");

events.on("pull_request", async function(e, project) {

    // The payload is a string we need to parse into JSON to access
    const ghData = JSON.parse(e.payload);

    // Notify GH that 
    var ghn = new Notification("dco", e, project);
    ghn.text = "Checking for DCO";
    await ghn.run();

    // Get the commits to iterate over
    var cj = new Job(`github-pr-commits`, "mattfarina/github-pr-commits:latest");
    cj.env = {
        GITHUB_REPO: project.repo.name,
        GITHUB_TOKEN: project.secrets.ghToken,
        GITHUB_PR_NUMBER: ghData.number.toString(),
    }
    res = await cj.run();
    var tempJson = JSON.stringify(res.toString());
    tempJson = tempJson.replace(/\\n/g, "\\n")
                .replace(/\\'/g, "\\'")
                .replace(/\\"/g, '\\"')
                .replace(/\\&/g, "\\&")
                .replace(/\\r/g, "\\r")
                .replace(/\\t/g, "\\t")
                .replace(/\\b/g, "\\b")
                .replace(/\\f/g, "\\f");
    const commits = JSON.parse(tempJson);
    const re = /^Signed-off-by: (.*) <(.*)>$/im

    var count = 0, missed = 0;

    for (const {commit} of commits) {
        var signedOff = re.exec(commit.message);

        if (signedOff == null){
            missed++;
        }
        count++
    }

    // A notification that some were missed
    if (missed > 0) {
        ghn.text = missed + " out of " + count + " commits are missing signoff";
        ghn.state = "failure";
    } else {
        ghn.text = "All commits have signoff";
        ghn.state = "success";

        // Add the label so the bot knows it can merge
        var j = new Job(`github-label-adder`, "mattfarina/github-label-adder:0.1.0");
        j.env = {
            GITHUB_REPO: project.repo.name,
            GITHUB_ISSUE_LABEL: "Contribution Allowed",
            GITHUB_TOKEN: project.secrets.ghToken,
            GITHUB_ISSUE_NUMBER: ghData.number.toString(),
        }
        j.run();
    }
    ghn.run();
})

class Notification {
    constructor(name, e, p) {
        this.proj = p;
        this.e = e;
        this.payload = e.payload;
        this.text = "";

        this.context = name;

        // count allows us to send the notification multiple times, with a distinct pod name
        // each time.
        this.count = 0;

        // One of: "success", "failure", "neutral", "cancelled", or "timed_out".
        this.state = "pending";
    }

    // Send a new notification, and return a Promise<result>.
    run() {
        this.count++
        var j = new Job(`${ this.context }-${ this.count }`, "technosophos/github-notify:1.0.0");
        j.env = {
            GH_REPO: this.proj.repo.name,
            GH_STATE: this.state,
            GH_TOKEN: this.proj.secrets.ghToken,
            GH_COMMIT: this.e.revision.commit,
            GH_DESCRIPTION: this.text,
            GH_CONTEXT: this.context,
        }
        return j.run();
    }
}