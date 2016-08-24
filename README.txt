To use, run a web server from the current directory. Everything is static HTML
and JSON, so virtually any server will work.

The easiest option is to use Python's build-in web server. The commands differs
depending on whether you're using Python 2 or 3.

    python2 -m SimpleHTTPServer

Or:

    python3 -m http.server

Then, just access http://localhost:8000 in your browser. If your results are
on a cluster that's firewalled off from the outside world, you can tunnel
through using the -L option in SSH. Feel free to e-mail me for help.
