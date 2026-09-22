# Estágio de Build
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["glaciar.API/glaciar.API.csproj", "glaciar.API/"]
COPY ["glaciar.Application/glaciar.Application.csproj", "glaciar.Application/"]
COPY ["glaciar.Domain/glaciar.Domain.csproj", "glaciar.Domain/"]
COPY ["glaciar.Infrastructure/glaciar.Infrastructure.csproj", "glaciar.Infrastructure/"]
RUN dotnet restore "glaciar.API/glaciar.API.csproj"

COPY . .
WORKDIR "/src/glaciar.API"
RUN dotnet publish "glaciar.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
 
EXPOSE 8080 
ENTRYPOINT ["dotnet", "glaciar.API.dll"]