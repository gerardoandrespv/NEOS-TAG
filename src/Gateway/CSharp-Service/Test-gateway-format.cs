using System;
using System.Net.Http;
using System.Text;
using Newtonsoft.Json;

class Test {
    static async Task Main() {
        var client = new HttpClient();
        var url = "https://us-central1-neos-tech.cloudfunctions.net/rfid-gateway";
        
        // Test 1: Formato que debería enviar
        var correctFormat = new {
            id = "TEST123",
            readsn = "TY001",
            client_id = "condominio-neos",
            timestamp = DateTime.UtcNow.ToString("o")
        };
        
        var json = JsonConvert.SerializeObject(correctFormat);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        
        // Agregar header también
        client.DefaultRequestHeaders.Add("X-Client-ID", "condominio-neos");
        
        var response = await client.PostAsync(url, content);
        var result = await response.Content.ReadAsStringAsync();
        Console.WriteLine($"Respuesta: {result}");
    }
}
