// This class can watch a directory and stage potential changes to execute later on.

const chokidar     = require('chokidar');

/*
 * Some words on the ignoring array: We cannot simply pause() and resume() the
 * watchdog during save operations, because the write process will trigger a
 * change event after the save process has stopped. This means that the actual
 * event will be fired by chokidar only AFTER resume() has been called already.
 * Therefore we will just be ignoring change events for the specific path.
 */

class ZettlrWatchdog
{
    // Create a new watcher instance
    constructor(path)
    {
        this.staged = [];
        this.ignored = [];
        this.ready = false;
        this.process = null;
        this.watch = false;
        this.path = path;
    }

    // Initiate watching process and stage all changes in the staged-array
    start()
    {
        // Begin watching the base dir.
        this.process = chokidar.watch(this.path, {
            ignored: /(^|[\/\\])\../,
            persistent: true,
            ignoreInitial: true // Do not track the initial watch as changes
        });

        this.process.on('ready', () => {
            this.watch = true;
            this.ready = true;
        });

        this.process.on('all', (event, path) => {
            if(this.watch) {
                // Should we ignore this event?
                for(let i in this.ignored) {
                    if(this.ignored[i].type == event && this.ignored[i].path == path) {
                        // We have ignored it once -> remove from array
                        this.ignored.splice(i, 1);
                        return;
                    }
                }

                this.staged.push({ 'type': event, 'path': path });
            }
        });
    }

    // Stop the watchdog completely (saves energy on pause because the process
    // is terminated)
    stop()
    {
        this.process.close();
        this.process = null;
    }

    // Temporarily pause the watchdog (don't stage changes)
    pause() { this.watch = false; }
    // Resume watching
    resume() { this.watch = true; }

    isWatching() { return this.watch; }
    isReady() { return this.ready; }

    // Return the complete array
    getChanges() { return this.staged; }

    // Returns number of staged changes
    countChanges() { return this.staged.length; }

    // Remove all changes from array.
    flush() { this.staged = []; }

    // Sets the path to be watched
    setPath(path) { this.path = path; }

    // Restarts the service
    restart()
    {
        if(this.process != null) {
            this.stop();
        }

        this.start();
    }

    // Iterate over all staged changes
    each(callback)
    {
        let t = {};
        if(callback && t.toString.call(callback) === '[object Function]') {
            for(let change of this.staged) {
                callback(change.type, change.path);
            }
        }
    }

    // Ignore the next event of type evt for path "path"
    // Useful to ignore save events from the editor
    ignoreNext(evt, path)
    {
        this.ignored.push({ 'type': evt, 'path': path });
    }
}

module.exports = ZettlrWatchdog;