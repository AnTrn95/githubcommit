from notebook.utils import url_path_join as ujoin
from notebook.base.handlers import IPythonHandler
import os, json, git, urllib, requests
from git import Repo, GitCommandError
from subprocess import check_output, call
from os.path import expanduser

class GitCommitHandler(IPythonHandler):

    def error_and_return(self, dirname, reason):

        # send error
        self.send_error(500, reason=reason)

        # return to directory
        os.chdir(dirname)

    def put(self):

        # git parameters from environment variables
        # expand variables since Docker's will pass VAR=$VAL as $VAL without expansion
        data = json.loads(self.request.body.decode('utf-8'))
        git_dir = "{}/{}".format(expanduser("~"), data['filepath'])
        
        # Grant read access permission for settings file: get Git Remote
        settings_dir = os.path.expandvars(os.environ.get('GIT_SETTINGS_FILE'))
        file = open(settings_dir, "r")
        
        data = json.loads(file.read())
        git_remote = data['branch-name']
        git_url = check_output(['git', 'config', '--get', 'remote.origin.url']).strip()

        # get the parent directory for git operations
        git_dir_parent = os.path.dirname(git_dir)

    try:
        # obtain commit message
        data = json.loads(self.request.body.decode('utf-8'))
        msg = data['msg']

        # get current directory (to return later)
        cwd = os.getcwd()

        # select branch within repo
        try:
            os.chdir(git_dir)
            dir_repo = check_output(['git','rev-parse','--show-toplevel']).strip()
            repo = Repo(dir_repo.decode('utf8'))
            os.chdir(dir_repo)
        except ValueError:
            return
        except GitCommandError as e:
            self.error_and_return(cwd, "Could not checkout repo: {}{}".format(dir_repo, git_dir))
            return

        # commit current notebook
        # client will sent pathname containing git directory; append to git directory's parent
        try:
            check_output(['git', 'add', '--all']).strip()
            call(['git', 'commit', '-m', msg])
        except GitCommandError as e:
            print(e)
            self.error_and_return(cwd, "Could not commit changes to notebook: "+ git_dir )
            return

        # push changes
        try:
            pushed = check_output(['git', 'push']).strip()
        except GitCommandError as e:
            print(e)
            self.error_and_return(cwd, "Could not push to remote {}".format(git_remote) + os.path.expanduser('~'))
            return
            
        result = check_output(['bash', '-c', "git push"])

        # return to directory
        os.chdir(cwd)

        # close connection
        self.write({'status': 200, 'statusText': 'Success! Changes are pushed.'})

class GitSettingsHandler(IPythonHandler):

    def error_and_return(self, dirname, reason):

        # send error
        self.send_error(501, reason=reason+'test')
        
        # return to directory
        os.chdir(dirname)
        
    def post(self):
        data = json.loads(self.request.body.decode('utf-8'))
        git_dir = "{}{}".format(expanduser("~"), data['filepath'])
        os.chdir(git_dir)

        try:
            ssh_dir = os.path.expandvars(os.environ.get('GIT_PUBKEY_FILE'))
            settings_dir = os.path.expandvars(os.environ.get('GIT_SETTINGS_FILE'))
            dir_repo = check_output(['git','rev-parse','--show-toplevel']).strip()
            repo = Repo(dir_repo.decode('utf8'))
            

            # append the received JSON object with additional git values: SSH Key, Git Parent-Direction, Remote-URL
            file = open(ssh_dir, "r")
            data['key'] = file.read()
            data['parent-dir'] = os.environ.get('GIT_PARENT_DIR')
            data['remote-url'] = repo.remotes.origin.url
            
            # set your user name and email address - obligatory information for git commits
            check_output(['git','config','user.email',data['email']]).strip()
            check_output(['git','config','user.name',data['user']]).strip()
            
            # JSON file: If none exists, create a new file and grant write access permission
            the_file = open(settings_dir, 'w+')
            the_file.write(json.dumps(data))
            the_file.close();

        except ValueError:
            print("Error: saving JSON file failed.")

        self.write({'status': 200, 'statusText': 'Success! Settings file saved.'})

    def get(self):
        settings_dir = os.path.expandvars(os.environ.get('GIT_SETTINGS_FILE'))
  
        try:
            file = open(settings_dir, "r")
            json = file.read()
            self.write({'status': 200, 'statusText': 'Success! loading settings', 'msg': json})
            file.close();
        except ValueError:
            print("Error reading file")
            self.write({'status': 404, 'statusText': 'file not found'})

def setup_handlers(nbapp):
    route_pattern = r"/user/\w+/notebooks/git/commit"
    nbapp.add_handlers('.*', [(route_pattern, GitCommitHandler)])
    route_pattern = r"/user/\w+/notebooks/settings"
    nbapp.add_handlers('.*', [(route_pattern, GitSettingsHandler)])

