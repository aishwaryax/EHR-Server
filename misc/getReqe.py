import requests as req
import json
import urllib.parse as up
# Analyzing and sending request
HOST = 'http://localhost:4466'

# query{
#   countries{
#     id
#     countryCode
#     countryName
#   }
# }

json = { 'query' : '{ hospitals { id } } ' }
api_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7InNlcnZpY2UiOiJkZWZhdWx0QGRlZmF1bHQiLCJyb2xlcyI6WyJhZG1pbiJdfSwiaWF0IjoxNTcxMDc0OTM3LCJleHAiOjE1NzE2Nzk3Mzd9.Gr5ySAPDWgZpeAZgVKDc-ub3j_XI4UC2qzF7rITSpRc"
headers = {'Authorization': 'Bearer %s' % api_token}

ourRequest = req.post(url=HOST, json=json, headers=headers)
print(ourRequest.text)
print(ourRequest.status_code)