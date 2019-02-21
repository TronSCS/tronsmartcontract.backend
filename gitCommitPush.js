const Octokit = require('@octokit/rest')
var GITHUB_API_TOKEN = process.env.GITHUB_API_TOKEN;
exports.gitCommitPush = async function (inputOptions) {
    try {
        if (!inputOptions.owner || !inputOptions.repo || !inputOptions.files || !inputOptions.files.length) {
            return "";
        }
        var token = inputOptions.token || GITHUB_API_TOKEN;
        if (!token) {
            throw new Error("token is not defined");
        }
        var github = new Octokit({ auth: token });
        var options = {
            owner: inputOptions.owner,
            repo: inputOptions.repo,
            files: inputOptions.files,
            fullyQualifiedRef: inputOptions.fullyQualifiedRef || "heads/dev",
            forceUpdate: inputOptions.forceUpdate || false,
            commitMessage: inputOptions.commitMessage || "Commit - " + new Date().getTime().toString()
        };
        let result = await github.git.getRef({
            owner: options.owner,
            repo: options.repo,
            ref: options.fullyQualifiedRef
        });
        let referenceCommitSha = result.data.object.sha;
        let files = []
        for(let i=0;i<options.files.length;i++){
            let file=options.files[i];
            if (typeof file.path === "string" && typeof file.content === "string") {
                let resultCreateBlob = await github.git.createBlob({
                    owner: options.owner,
                    repo: options.repo,
                    content: file.content,
                    encoding: "utf-8"
                })
                files.push({
                    sha: resultCreateBlob.data.sha,
                    path: file.path,
                    mode: "100644",
                    type: "blob"
                });
            }
        };
        let resultCreateTree = await github.git.createTree({
            owner: options.owner,
            repo: options.repo,
            tree: files,
            base_tree: referenceCommitSha
        });
        let newTreeSha = resultCreateTree.data.sha;
        var resultCreateCommit = await github.git.createCommit({
            owner: options.owner,
            repo: options.repo,
            message: options.commitMessage || "commit",
            tree: newTreeSha,
            parents: [referenceCommitSha]
        })
        let newCommitSha = resultCreateCommit.data.sha;

        var updateReference = await github.git.updateRef({
            owner: options.owner,
            repo: options.repo,
            ref: options.fullyQualifiedRef,
            sha: newCommitSha,
            force: options.forceUpdate
        });
        return updateReference;
    }
    catch (err) {
        throw err;
    }

};

