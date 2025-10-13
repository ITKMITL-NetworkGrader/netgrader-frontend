# CNI2024-Exam v1

ชื่อ-นามสกุล ………………………………………………………………………………………..

เลขประจำตัวนักศึกษา ……………………………………………………………………………

![Screenshot 2568-01-19 at 10.01.22.png](CNI2024-Exam%20v1%2018086ecd18de80ca8dffed6e432236e4/Screenshot_2568-01-19_at_10.01.22.png)

นักศึกษาแต่ละคนจะถูกกำหนดค่า IPv4, IPv6 และ VLAN ให้ทำ Lab ด้วยค่า Random Numbers ของตนเอง และใน Pod ของตนเองเท่านั้น

**Label**

| Router0 | iol-0 |
| --- | --- |
| Router1 | iol-1 |
| Switch0 | iol-l2-0 |
| PC-1 | ubuntu-0 |
| PC-2 | ubuntu-1 |

**Random Numbers**

| X |  |
| --- | --- |
| Y |  |
| Z |  |
| A |  |
| B |  |

# ข้อตกลง

1. ข้อสอบ Open-book Open-Internet สามารถนำบันทึกเข้าห้องสอบและสืบค้นบน Internet ได้
2. สอบเวลา 13:30-16:30 น. เข้าห้องสอบได้ตั้งแต่เวลา 13:10 น.
3. เมื่อทำเสร็จแต่ละ Part ให้ตรวจ Part นั้นก่อน จึงจะทำข้อสอบ Part ต่อไปได้
4. หากตรวจ Part ใดแล้ว ยังมีที่ผิด ให้แก้ไขจนกว่าจะถูกต้องทั้งหมดก่อน จึงจะทำข้อสอบใน Part ถัดไปได้
5. เมื่อหมดเวลาสอบให้รอจนตรวจข้อสอบเสร็จและทราบคะแนนก่อน จึงออกจากห้องสอบ

# Part 1: 1 คะแนน (10 นาที)

1. ทำการสร้าง Lab ใหม่ และ Add nodes และ Add Links ดังรูป Topology ด้านบน 
2. เกณฑ์การให้คะแนน
    1. ต่อ Topology และตั้งค่า Annotation ถูกต้อง
    2. ไม่มี Configuration ค้างใน Router0, Router1, Switch, ubuntu-0 และ ubuntu-1
    3. ตั้งชื่อ Lab เป็น **`Lab-รหัสนักศึกษา`** เช่น **`Lab-64070017`**
    4. ตั้งชื่อ Node ของ Ubuntu ให้ตรงกับในรูป Topology (ubuntu-0, ubuntu-1)
    5. ตั้งค่า Hostname และ Node ของ Router และ Switch เป็น `Router0` `Router1` และ `Switch0` ตามลำดับ

# Part 2: 5 คะแนน (20 นาที)

## IP Assignment

**Subnet**

ใส่ค่าลงในตารางด้านล่าง และ configure อุปกรณ์ ให้ถูกต้องครบถ้วน ตามข้อกำหนดต่อไปนี้ 

1. กำหนดให้  IPv4 เป็นค่า **`[172.X.Y.128/25]`**  และกำหนดให้ ****VLAN A กับ B โดย X, Y, Z, A, B จะเป็นเลขที่ถูกสุ่มขึ้นมาของแต่ละคน ตามค่าในตารางด้านบน
    - Subnet 0: Subnet VLAN ที่มี ubuntu-1 และ Switch0 (VLAN `A`) มี IP ที่สามารถใช้งานได้อย่างน้อย `30` IP และต้องใกล้เคียงมากที่สุด
    - Subnet 0: Subnet VLAN ที่มี ubuntu-2 (VLAN **`B`**) มี IP ที่สามารถใช้งานได้อย่างน้อย `50` IP และต้องใกล้เคียงมากที่สุด
    
    ให้แบ่ง Subnet VLAN `A` ที่มี ubuntu-1 ก่อน ดังนั้นค่า Subnet Number ของ VLAN `A` จะต้องน้อยกว่า Subnet Number ของ VLAN `B`
    
2. กำหนดให้ IPv4 Network ระหว่าง Router0 และ Router1 เป็น [192.168.Z.0/24] 
3. กำหนดให้นักศึกษามี IPv6 Global Unicast Routing Prefix `2001:X:Y::/48` และกำหนดให้ VLAN A กับ B ****โดย X, Y, A, B จะเป็นเลขที่ถูกสุ่มขึ้นมาของแต่ละคน ตามค่าในตารางด้านบน
    
    ให้นักศึกษาแบ่ง Subnet เป็น 2 Subnet ได้แก่ → 
    
    - Subnet 0: Subnet VLAN `A` โดยใช้หมายเลข VLAN เป็นหมายเลข Subnet ID และ Prefix Length /64 เช่น `2001:X:Y:A::/64`
    - Subnet 1: Subnet VLAN `B` โดยใช้หมายเลข VLAN เป็นหมายเลข Subnet ID และ Prefix Length /64 เช่น `2001:X:Y:B::/64`
    
    ให้นักศึกษาแบ่ง Subnet เป็น 2 Subnet ข้างต้น โดยใช้หมายเลข VLAN เป็นหมายเลข Subnet ID
    
4. กำหนดให้ IPv6 Network ระหว่าง Router0 และ Router1 เป็น [2001.X.Y.Z::/64] 

**IPv4**

- IPv4 ของ `Router0` และ `Router1` มี Host ID ที่สามารถใช้ได้ เป็น Host ลำดับที่ `1` ของ Subnet นั้น ยกเว้น Interface E0/1 ของ `Router` ให้ใช้ Host ลำดับสุดท้าย ของ Subnet นั้น และ E0/1 ของ `Router0` ให้ใช้ ค่า `Z` เป็น Host ID
- IPv4 ของ `PC-1` มี Host ID ที่สามารถใช้ได้ เป็น Host ลำดับที่ 2 ที่สามารถใช้ได้ใน Subnet นั้น (DNS Server คือ Router1)
- `PC-2`, ได้รับ IPv4, Subnet Mask, Gateway, DNS ผ่าน DHCPv4 จาก Router0 โดยต้องได้ IPv4 ที่มี Host ID ที่สามารถใช้ได้ เป็นลำดับที่ `5-10` ของ Subnet นั้นเท่านั้น (DNS Server คือ Router1)
- IPv4 ของ `Switch` มี Host ID ที่สามารถใช้ได้ เป็น Host ลำดับ `สุดท้าย` ของ Subnet นั้น

**Clouds**

- เชื่อมกับเครือข่ายภายในห้อง VLAN306 และ Internet ด้วย Cloud (ext-conn-0 โดย bridge กับ bridge0) ต่อกับ `Router0` ที่ Interface E0/1 ใช้ IPv4 `10.30.6.Z/24`
    - bridge0 คือ bridge ที่เชื่อมต่อกับ Network Interface Card ที่ต่อกับ VLAN306 ของคณะฯ
    - Default Route สำหรับ `Router0` เพื่อเชื่อมต่อ Internet คือ `10.30.6.1`

**กรอกค่าลงในตารางในช่องว่าง** 

| Device | Interface | IPv4 | Subnet Mask | Default Gateway | DNS |
| --- | --- | --- | --- | --- | --- |
| Router0 | E0/0 | 192.168.Z.ลำดับแรก |  | N/A | N/A |
| Router0 | E0/1 | 10.30.6.(Z) | 255.255.255.0 |  | N/A |
| Router1 | E0/0.A |  |  | N/A | N/A |
| Router1 | E0/0.B |  |  | N/A | N/A |
| Router1 | E0/1 | 192.168.Z.ลำดับสุดท้าย |  |  | N/A |
| Switch0 | VLAN A |  |  |  | N/A |
| PC-1 | ens2 |  |  |  | RP |
| PC-2 | ens2 |  |  |  | RP |

**IPv6**

- ใช้ Prefix Length 64 bits ทุก Subnet
- IPv6 ของ Router0 มี Interface ID = 1 เสมอ
- IPv6 ของ Router1 มี Interface ID =  1 เสมอ ยกเว้น Interface E0/1 ให้ใช้ Interface ID = 2
- GUA IPv6 ของ PC-1 มี Interface ID = 2 เสมอ
- GUA IPv6 ของ PC-2 ได้รับ IPv6 ผ่านทาง SLAAC
- Link Local ใช้ FE80:: ทั้งหมดทุก Link และให้ Router ใช้ Interface ID = 1 ทั้งหมด ยกเว้น ที่ Router1 Interface E0/1 ให้ใช้ Interface ID = 2
- ค่า Default Gateway IPv6 address ของ PC-1 และ PC-2 ให้ใช้ค่า Link Local Address
- Switch0 อยู่ใน Subnet เดียวกับ VLAN A และ GUA IP ของ Switch มี Interface ID = 3 เสมอ
- **ไม่มี IPv6 ใน Cloud ที่เชื่อมต่อไปยัง Instructor Pod และ Internet**

**กรอกค่าลงในตารางในช่องว่าง**

| Device | Interface | GUA | Prefix-Length | Link-Local Address | Gateway |
| --- | --- | --- | --- | --- | --- |
| Router0 | E0/0 | 2001.X.Y.Z::1 |  | FE80::1 | N/A |
| Router1 | E0/0.A |  |  | FE80::1 | N/A |
| Router1 | E0/0.B |  |  | FE80::1 | N/A |
| Router1 | E0/1 | 2001.X.Y.Z::2 |  | FE80::2 | N/A |
| Switch0 | VLAN A |  |  | FE80::3 |  |
| PC-1 | ens2 |  |  | FE80::2 |  |
| PC-2 | ens2 |  |  | N/A |  |

ให้เปิด Service SSH และตั้งค่าอุปกรณ์ Router0, Router1, PC-1, PC-2 ให้สามารถ SSH ผ่านเครือข่าย Cloud (ext-conn-0) โดยใช้ username: cisco และ password: cisco เท่านั้น

# Part 3: 6 คะแนน (20 นาที)

## Basic Connectivity

1. [0.5 คะแนน] PC-1 สามารถ Ping IPv4 S0 ได้
2. [0.5 คะแนน] PC-1 สามารถ Ping IPv4 PC-2 ได้
3. [0.5 คะแนน] PC-1 สามารถ Ping IPv4 Router0 (E0/0) ได้
4. [0.5 คะแนน] PC-2 สามารถ Ping IPv4 S0 ได้
5. [0.5 คะแนน] PC-2 สามารถ Ping IPv6 PC1 ได้
6. [0.5 คะแนน] PC-2 สามารถ Ping IPv6 S0 ได้
7. [0.5 คะแนน] PC-1 สามารถ Ping IPv6 PC-2 ได้
8. [0.5 คะแนน] PC-2 สามารถ Ping IPv6 Router0 (E0/0) ได้
9. [0.5 คะแนน] PC-1 สามารถ Ping IPv4 WebServer (IP `172.17.1.100/24`) ที่อยู่ใน Instructor Pod ได้
10. [0.5 คะแนน] PC-2 สามารถ Ping IPv4 WebServer (IP `172.17.1.100/24`) ที่อยู่ใน Instructor Pod ได้
11. [0.5 คะแนน] PC-1 สามารถ Ping IPv4 1.1.1.1 ได้ 
12. [0.5 คะแนน] PC-2 สามารถ Ping IPv4 1.1.1.1 ได้

# Part 4: 2 คะแนน (10 นาที)

## Services

1. [0.5 คะแนน] 
    1. เปิด DNS Service ที่ Router1 และทำให้ PC-1 สามารถ Ping Switch0 ด้วยชื่อ `S{Z}.itkmitl.lab` ได้ เช่น Z=100 ให้ Ping `S100.itkmitl.lab` ได้
    2. ตั้งค่า DNS ที่ Router1 และให้ PC-2 ให้สามารถเปิด Web Browser (curl) ไปที่ WebServer IP `172.17.1.100` ด้วย [`http://web.itkmitl.lab`](http://web.itkmitl.lab) ได้
2. [0.5 คะแนน] เปิด TFTP Service ที่ PC-1 และให้ Backup running-config ของ RP มาเก็บที่ PC-1
3. [0.5 คะแนน] เปิด Telnet Service ที่ Switch0 และให้ PC-2 สามารถ Telnet มาที่ Switch0 ได้ 
4. [0.5 คะแนน] ใช้คำสั่ง Curl จาก PC1 ไปที่ Internet เช่น [www.google.com](http://www.google.com) สำเร็จ โดยให้ตั้งค่า Router1 Relay DNS ไปที่ Public DNS Server เช่น 8.8.8.8

# Part 5: 2 คะแนน (10 นาที)

## Security

1. [0.5 คะแนน] ไม่อนุญาตให้ PC-2 Telnet มาที่ Switch0 ได้ แต่เครื่องอื่นๆ (รวม Router0, Router1, PC-1) ต้อง Telnet มาได้ทั้งหมด ด้วย IPv4
2. [0.5 คะแนน] ไม่อนุญาตให้ PC-2 Ping IPv4 มาที่ PC-1 ได้ แต่ให้ PC-1 Ping IPv4 มาที่ PC-2 ได้
3. [0.5 คะแนน] ไม่อนุญาตให้ Ping ทุก IPv6 ของ VLAN A มาที่ Interface E0/0 ของ Router0 ได้ แต่ยังสามารถ Ping IPv6 ไปที่อื่นๆได้ (ให้ตั้งค่า ACL ที่ Router1)
4. [0.5 คะแนน] มี Hacker อยู่ใน Instructor Pod กำลัง Ping Flood มาที่ Router0 ด้วย IPv4 ให้ Block เฉพาะ IPv4 ของ Hacker เท่านั้น ด้วย ACL ที่ Router0 (Hacker IPv4 Address อยู่ใน Subnet เดียวกับ Web Server IPv4 Address)

รับทราบคะแนนก่อนออกจากห้องสอบ