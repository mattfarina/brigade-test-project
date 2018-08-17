const { events, Job } = require("brigadier");

events.on("pull_request", function(e, project) {

  var foo = new Notification("yodeling", e, project);
  foo.text = "Just testing";
  foo.run();

  foo.text = "wee";
  foo.state = "success";
  foo.run();

  
})

// A GitHub Check Suite notification
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