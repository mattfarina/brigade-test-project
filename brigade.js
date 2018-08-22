const { events, Job } = require("brigadier");
const octokit = require("@octokit/rest")();

events.on("pull_request", async function(e, project) {

    // The payload is a string we need to parse into JSON to access
    const ghData = JSON.parse(e.payload);

    // Notify GH that 
    var foo = new Notification("dco", e, project);
    foo.text = "Checking for DCO";
    await foo.run();

    // Get the commits to check. The pull_request event does not provide these
    // but we can query for them.
    // Authenticating for higher rate limit count.
    octokit.authenticate({
        type: 'token',
        token: project.secrets.ghToken
    });

    // Iterate over each commit to make sure the message has the DCO
    // This is not meant to replace probots DCO check but rather apply a label
    // When the DCO appears to be there. This should compliment probot as this
    // is looser but is meant to allow us to use k8s prow automation.?
    // TODO: rewrite this as a job?
    const re = /^Signed-off-by: (.*) <(.*)>$/im
    var parts = project.repo.name.split("/");
    const results = await octokit.pullRequests.getCommits({
        owner: parts[0],
        repo: parts[1],
        number: ghData.number,
        per_page: 100
    });

    for (result in results) {
        console.log(result.commit.message);
    }


    foo.text = "wee";
    foo.state = "success";
    await foo.run();

    // Test adding a label
    var j = new Job(`just-a-test`, "mattfarina/github-label-adder:latest");
    j.env = {
        GITHUB_REPO: project.repo.name,
        GITHUB_ISSUE_LABEL: "invalid",
        GITHUB_TOKEN: project.secrets.ghToken,
        GITHUB_ISSUE_NUMBER: ghData.number.toString(),
    }
    await j.run();
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