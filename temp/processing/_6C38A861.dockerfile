# Dockerfile
# Usa la imagen base oficial de Microsoft para .NET 8
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 60000

# Etapa de construcción
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copiar archivos del proyecto
COPY ["RFID_Gateway.csproj", "./"]
RUN dotnet restore "RFID_Gateway.csproj"

# Copiar el resto del código
COPY . .

# Compilar la aplicación
RUN dotnet build "RFID_Gateway.csproj" -c Release -o /app/build

# Publicar la aplicación
FROM build AS publish
RUN dotnet publish "RFID_Gateway.csproj" -c Release -o /app/publish

# Etapa final
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .

# Definir el comando de inicio
ENTRYPOINT ["dotnet", "RFID_Gateway.dll"]