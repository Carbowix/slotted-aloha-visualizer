const defaultValues = {
    'clients': 3,
    'timeslots': 10,
    'probability': 0.33, // 1 / 3 clients
    'REprobability': 0.15
}
const states = {
    'SILENT': 0,
    'TRANSMIT': 1
};
let clients, timeslots, probability, REprobability;
let Atrans = 0, Strans = 0, collisions = 0;
let delayVisual = 500;
let currentSessionClients = [], currentSessionTimeslots = [];

class Client {
    constructor(id) {
        this.id = id;
        this.state = states['SILENT'];
        this.packetID = 0;
        this.packetAttempts = 0;
        this.transmissions = 0;
        this.successTransmissions = 0;
    }

    createPacket() {
        this.state = states['TRANSMIT'];
        this.transmissions += 1;
        this.packetID += 1;
        this.packetAttempts = 1;
    }

    send() {
        this.transmissions += 1;
        this.packetAttempts += 1;
    }
};


function loadAloha() {
    clients = $('#clients_n').val();
    if (!clients) clients = defaultValues['clients'];
    timeslots = $('#timeslots_n').val();
    if (!timeslots) timeslots = defaultValues['timeslots'];
    probability = $('#trans_n').val();
    if (!probability) probability = defaultValues['probability'];
    REprobability = $('#retrans_n').val();
    if (!REprobability) REprobability = defaultValues['REprobability'];

    $('#startMenu').fadeOut();
    emptyTables();
    // p(1-p)N-1 prob that given node has success in a slot
    // prob that any node has a success = Np(1-p)N-1
    let nodeSuccess = (probability * Math.pow((1 - probability), clients - 1) * 100).toFixed(2);
    let anyNodeSuccess = (clients * probability * Math.pow((1 - probability), clients - 1) * 100).toFixed(2);
    $('#probSTransmit').text(nodeSuccess + '%');
    $('#probATransmit').text(anyNodeSuccess + '%');

    // Load the clients
    for (let i = 1; i <= clients; i++) {
        currentSessionClients.push(new Client(i));
        $('#timelineBody').append(`
        <tr id='client_${i}'>
            <td>
                <div>CLIENT#${i}</div>
            </td>
        </tr>
        `);
    
        $('#statusHeader').append(`
            <th class="timeSlot">
                CLIENT #${i}
            </th>
        `);
        $('#statusAttempted').append(`
            <td style="background-color: white; text-align: center;">
                <div id='attempted_${i}'>
                    0
                </div>
            </td>
        `);

        $('#statusSuccess').append(`
            <td style="background-color: darkgray; text-align: center;">
                <div id='success_${i}'>
                    0
                </div>
            </td>
        `);
    }

    let visualCounter = 0;
    let visualInterval = setInterval(function () {
        visualCounter += 1;
        if (visualCounter > timeslots) {
            clearInterval(visualInterval);
            visualInterval = null;
            visualCounter = 0;
            return;
        }
        currentSessionTimeslots[visualCounter - 1] = [];
        $('#timelineHeader').append(`
            <th class="timeSlot">
                ${visualCounter}
            </th>
        `);
        currentSessionClients.forEach(cli => {
            // Client is silent, (Check for transmission probability)
            if (cli.state == states['SILENT']) {
                if (Math.random() <= probability) { // can send,,,,
                    cli.createPacket();
                    currentSessionTimeslots[visualCounter - 1].push(cli);
                    Atrans += 1; // Increase total number of attempted transmissions globally
                }   
                console.log(`[CLIENT#${cli.id}]: SILENT PROBABILITY FAIL`);
            } else {
                if (Math.random() <= REprobability) {
                    cli.send();
                    currentSessionTimeslots[visualCounter - 1].push(cli);
                    Atrans += 1; // Increase total number of attempted transmissions globally
                }
                console.log(`[CLIENT#${cli.id}]: TRANSMIT RE-PROBABILITY FAIL`);
            }
        });
        
        let transmittingNodes = currentSessionTimeslots[visualCounter - 1];
        if (transmittingNodes.length == 1) { // Success
            const currentNode = transmittingNodes[0];
            console.log(`TIMESLOT[${visualCounter}]: SUCCESS, CLIENT#${currentNode.id}`);
            Strans += 1; // Increase total number of successful transmissions globally
            $(`tr#client_${currentNode.id}`).append(`
                <td id="timelinePacket" class="success">
                    <div>
                        Packet #ID ${currentNode.packetID}
                    </div>
                    <div>Attempt: ${currentNode.packetAttempts}</div>
                </td>
            `);
            currentNode.state = states['SILENT'];
            currentNode.successTransmissions += 1;
        } else if (transmittingNodes.length > 1) { // Collision
            console.log(`TIMESLOT[${visualCounter}]: COLLISION`);
            collisions += 1;  // Increase total number of collisions transmissions globally
            transmittingNodes.forEach(node => {
                $(`tr#client_${node.id}`).append(`
                <td id="timelinePacket" class="collision">
                    <div>
                        Packet #ID ${node.packetID}
                    </div>
                    <div>Attempt: ${node.packetAttempts}</div>
                </td>
                `);
            });
        }
        
        currentSessionClients.forEach(cli => {
            if (!transmittingNodes.includes(cli)) { // Insert Empty slot for the current timeslot
                $(`tr#client_${cli.id}`).append(`
                <td id="timelinePacket" class="empty">
                    <div>
                    EMPTY
                    </div>
                </td>
                `);
            }
        });
        $('.tableArea > div').scrollLeft(999);
        updateStatus();
        console.log(`TIMESLOT[${visualCounter}]: END`)
    }, delayVisual);

    $('#visual').fadeIn();
};

function updateStatus () {
    currentSessionClients.forEach(cli => {
        $(`#attempted_${cli.id}`).text(cli.transmissions);
        $(`#success_${cli.id}`).text(cli.successTransmissions);
    });
    console.log(`UPDATE: ${Atrans}, ${Strans}, ${collisions}`)
    $('#totalATransmits').text(Atrans.toString());
    $('#totalSTransmits').text(Strans.toString());
    $('#totalCTransmits').text(collisions.toString());
    $('#eff').text((Strans / Atrans).toFixed(2).toString());
}

function emptyTables() {
    $('#timelineBody, #timelineHeader, #statusHeader, #statusAttempted, #statusSuccess').empty();
    $('#statusHeader, #timelineHeader').append(`
    <th></th>
    `);
    $('#statusAttempted').append(`
<td>
    <div>Attempted</div>
</td>
`);
    $('#statusSuccess').append(`
<td>
    <div>Success</div>
</td>
`);
}