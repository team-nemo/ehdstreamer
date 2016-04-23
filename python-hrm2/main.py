import serial
import struct
from socketIO_client import SocketIO, LoggingNamespace

socket = SocketIO('http://ehd2016.azurewebsites.net/', 80, LoggingNamespace)
f = open('secret.txt', 'r')
secret = f.readline().rstrip('\n')
f.close()

hrm = serial.Serial('/dev/tty.STHRM2-STHRM2')

while True:
    c = hrm.read()
    if c == chr(250):
        l = hrm.read(7)
        bpm = ord(l[4])
        ibi = (ord(l[5]) << 4) + (ord(l[6]) >> 4)
        print(ibi, bpm)
        socket.emit('data', {
            'room': 'heartrate',
            'id': 'hrm0',
            'data': {'bpm': bpm, 'ibi': ibi},
            'secret': secret
        })
