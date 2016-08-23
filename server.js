var express = require('express');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt');
var fs = require('fs');
var http = require('http');
var https = require('https');

var privateKey  = fs.readFileSync('ssl/key.pem', 'utf8');
var certificate = fs.readFileSync('ssl/cert.pem', 'utf8');
var credentials = {key: privateKey, cert: certificate};

var app = express();
app.use(bodyParser());

var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : 'medicamente-bd.ctnwnrrpnlth.us-west-2.rds.amazonaws.com',
  user     : 'Medicamente_BD',
  password : 'sd_medicamente_2016',
  database: "Medicamente"
});

var send_response = function(status, msg, res){
	var response = {status:status,msg:msg};
	res.json(response);
}

var send_mensage = function( email,  password, id_consulta, msg, res){
	var cpf = null;
	connection.query("SELECT password, cpf FROM Paciente WHERE email='"+email+"'", function(err, rows, fields) {
		if (err) 
			throw err;
		if(rows[0]){
			console.log('The Paciente password is: ', rows[0].password);
			password_saved = rows[0].password;
			cpf = rows[0].cpf;
			
			if(password_saved){

				if(bcrypt.compareSync(password, password_saved)){
					console.log("User Validated");
					send_mensage_aux(id_consulta, msg, res);
				}
				else
					send_response(false,"Senha Incorreta",res);	
			}
			else
				send_response(false,"Senha não definida",res);

		}
		else
			send_response(false,"Email não cadastrado",res);
	
	});

}


var send_mensage_aux = function(id_consulta, msg, res){
	var id_paciente = null;
	var id_medico = null;
	
	connection.query("SELECT Paciente_cpf, Medico_cpf FROM `Consulta` WHERE id="+id_consulta,
		function(err, rows, fields){
			if (err) 
				throw err;
			if(rows[0]){
				id_paciente = rows[0].Paciente_cpf;
				id_medico = rows[0].Medico_cpf;
				
				console.log("Paciente Encontrado");
				connection.query("UPDATE `Consulta` SET msg='"+msg+"' WHERE id = "+ id_consulta,
					function(err, rows, fields){
						if (err) 
							throw err;
						if(rows){
							console.log("Mensagem Enviada");
							send_response(true, "Mensagem Enviada",res);
						}
						else
							send_response(false,"Mensagem não Enviada",res);
					}
				);
			}
			else
				send_response(false,"Paciente Não Encontrado",res);
		}
	);

}
var get_med = function(email,password,qtd,res){
	var cpf = null;
	connection.query("SELECT password, cpf FROM Paciente WHERE email='"+email+"'", function(err, rows, fields) {
		if (err) 
			throw err;
		if(rows[0]){
			console.log('The Paciente password is: ', rows[0].password);
			password_saved = rows[0].password;
			cpf = rows[0].cpf;
			
			if(password_saved){

				if(bcrypt.compareSync(password, password_saved)){
					console.log("User Validated");
					get_med_aux(cpf,qtd,res)
				}
				else
					send_response(false,"Senha Incorreta",res);	
			}
			else
				send_response(false,"Senha não definida",res);

		}
		else
			send_response(false,"Email não cadastrado",res);
	
	});

}

var get_med_aux = function(paciente_cpf, qtd,res){
	var consulta_id = null
	connection.query("SELECT Prescricao.id , Prescricao.id_Consulta, Prescricao.medicamento,  Prescricao.concentracao, Prescricao.dosagem, Prescricao.dosagem_tipo,  Prescricao.turno_matutino, Prescricao.turno_vespertino,  Prescricao.turno_noturno,  Prescricao.periodo, Prescricao.periodo_tipo, Prescricao.duracao, Prescricao.duracao_tipo,  Prescricao.obs FROM Prescricao INNER JOIN Consulta ON Consulta.id=Prescricao.id_Consulta WHERE Consulta.Paciente_cpf='"+paciente_cpf+"'", function(err, rows, fields) {
		if (err) {
			var response = {status:true, data:err};
			res.json(response);
			throw err;
		}
			
		if(rows[0]){
			/*for(var i=0; i < rows.length; i++){
				console.log('The Medicamentos id is: ', rows[0].id);
			
			}*/
			console.log('Numeros de Medicamentosis: ', rows.length);
			if(qtd < rows.length){
				console.log(rows);
				var response = {status:true, data:rows.slice(qtd)};
				res.json(response);
			}else
				send_response(false,"Medicamentos não encontrados",res);
			
		}
		else
			send_response(false,"Medicamentos não encontrados",res);
	
	});
}

var sign_up = function(email, password, res){
	//connection.connect();
	var cpf = null;
	var saved_password = null;
	
	var response = {status:null,msg:'test'};
	
	connection.query("SELECT cpf,password FROM Paciente WHERE email='"+email+"'", function(err, rows, fields) {
	  if (err) 
	  	throw err;
	  if(rows[0]){
	  	console.log('The Paciente is: ', rows[0]);
	  	cpf = rows[0].cpf;
	  	saved_password = rows[0].password;
	  	
	  	console.log(cpf);

		if(cpf && !saved_password){
			var hash = bcrypt.hashSync(password, 10);
			console.log(hash);
			connection.query("UPDATE Paciente SET password='"+hash+"' WHERE cpf='"+cpf+"'", function(err, rows, fields) {
				  if (err) 
				  	throw err;
				  if(rows){
				  	console.log('The Paciente was updated: ', rows);
				  	
				  	response.status = true;
				    response.msg = "Usuário cadastrado!";
					console.log(response);
					
				    res.json(response);
				  		
				  }	  
			});
		}
		else{
			response.status = false;
			response.msg = "Senha já definida!";
			console.log(response);
			  
			res.json(response);
		}	
	  }else{
	  	response.status = false;
		response.msg = "Email não Cadastrado!";
		console.log(response);
		  
		res.json(response);
	  } 
	});
			
	//connection.end();
}

var login = function(email,password, res){
	var password_saved = null;
	var cpf = null;
	connection.query("SELECT password, cpf FROM Paciente WHERE email='"+email+"'", function(err, rows, fields) {
		if (err) 
			throw err;
		if(rows[0]){
			console.log('The Paciente password is: ', rows[0].password);
			password_saved = rows[0].password;
			
			console.log( password_saved);

			if( password_saved){

				if(bcrypt.compareSync(password,  password_saved)){
					send_response(true,"Login OK",res);
				}
				else
					send_response(false,"Senha Incorreta",res);	
			}
			else
				send_response(false,"Senha não definida",res);

		}
		else
			send_response(false,"Email não cadastrado",res);
	
	});
}




// This responds with "Hello World" on the homepage
app.get('/', function (req, res) {
   console.log("Got a GET request for the homepage");
   res.send('It is Working');
});

app.post('/sign_up', function(req, res){
	 console.log(req.body);
	 var email = req.body.email;
	 var password = req.body.password;
	 
	 if(email && password){
	 	
	 	sign_up(email,password,res);
	
	 }else
	 send_response(false,"Campos Vazios",res);
});

app.post('/login', function(req, res){
	 console.log(req.body);
	 var email = req.body.email;
	 var password = req.body.password;
	 
	 if(email && password){
	 	
	 	login(email,password,res);
	
	 }else
	 	send_response(false,"Campos Vazios",res);
});

app.post('/get_med', function(req, res){
	 console.log(req.body);
	 var email = req.body.email;
	 var password = req.body.password;
	 var qtd = req.body.qtd?req.body.qtd:0;
	 
	 
	 if(email && password){
	 	console.log("get med");
	 	get_med(email,password,qtd,res);
	
	 }else
	 	send_response(false,"Campos Vazios",res);
});

app.post('/send_msg', function(req, res){
	 console.log(req.body);
	 var email = req.body.email;
	 var password = req.body.password;
	 var id_consulta = req.body.id_consulta;
	 var msg = req.body.msg;
		 
	 
	 if((id_consulta && email && msg && password ){
	 	console.log("send msg");
	 	send_mensage(email,password,id_consulta, msg,res);
	
	 }else
	 	send_response(false,"Campos Vazios",res);
});


// Start the server
/*var server = app.listen(process.env.PORT || '8080', function () {
  console.log('App listening on port %s', server.address().port);
  console.log('Press Ctrl+C to quit.');
});*/

var httpServer = http.createServer(app);
var httpsServer = https.createServer(credentials, app);

httpServer.listen(8080);
httpsServer.listen(8443,
function () {
  console.log('App listening on port %s', httpsServer.address().port);
  console.log('Press Ctrl+C to quit.');}
);
// [END app]


