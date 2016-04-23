import argparse
from OSC import OSCServer
from socketIO_client import SocketIO, LoggingNamespace

socket = SocketIO('http://ehd2016.azurewebsites.net/', 80, LoggingNamespace)
f = open('secret.txt', 'r')
secret = f.readline().rstrip('\n')
f.close()

def send(path, tags, args, source):
    print(path, args)
    toSend = {
        'room': 'muse0',
        'id': path,
        'data': args,
        'secret': secret,
        'rapid': True
    }
    socket.emit('data', toSend)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--ip", default="localhost", help="The ip to listen on")
    parser.add_argument("--port", type=int, default=5001, help="The port to listen on")
    args = parser.parse_args()

    server = OSCServer((args.ip, args.port))
    server.addMsgHandler("default", send)
    server.serve_forever()
