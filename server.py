from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import pytz
import jwt
import hashlib
import secrets
from passlib.context import CryptContext
from io import StringIO
from fastapi.responses import StreamingResponse
from mangum import Mangum
from contextlib import asynccontextmanager

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection with optimized settings for Vercel serverless
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')

# Singleton pattern for database connection (2025 best practice)
class DatabaseConnection:
    _instance = None
    _client = None
    _db = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DatabaseConnection, cls).__new__(cls)
        return cls._instance
    
    def get_client(self):
        if self._client is None:
            # Optimized connection settings for serverless (2025 best practices)
            self._client = AsyncIOMotorClient(
                mongo_url,
                maxPoolSize=10,  # Optimize for serverless
                minPoolSize=1,   # Keep minimum connections
                serverSelectionTimeoutMS=5000,  # Fast timeout
                connectTimeoutMS=10000,  # Connection timeout
                socketTimeoutMS=30000,   # Socket timeout
                maxIdleTimeMS=45000,     # Close idle connections
                retryWrites=True,        # Retry failed writes
                w='majority'             # Write concern
            )
        return self._client
    
    def get_database(self):
        if self._db is None:
            client = self.get_client()
            self._db = client[os.environ.get('DB_NAME', 'showtime_portal')]
        return self._db

# Initialize database connection
db_connection = DatabaseConnection()
client = db_connection.get_client()
db = db_connection.get_database()

# Helper functions for new DEPARTMENT_DATA structure

def get_user_details_from_department_data(email_id: str) -> Optional[Dict[str, Any]]:
    """Fetches user details from DEPARTMENT_DATA by email_id."""
    if not email_id: return None
    for dept_name, teams in DEPARTMENT_DATA.items():
        for team_name, members in teams.items():
            for member in members:
                if member.get("Email ID") and member.get("Email ID").strip().lower() == email_id.strip().lower():
                    return {
                        "Name": member.get("Name"),
                        "Designation": member.get("Designation"),
                        "Reviewer": member.get("Reviewer"),
                        "Email ID": member.get("Email ID"),
                        "Department": dept_name,
                        "Team": team_name
                    }
    return None

def get_manager_role_from_department_data(email_id: str) -> Optional[str]:
    """Determines manager role (Reporting manager, Zonal Managers) or Employee from DEPARTMENT_DATA."""
    user_details = get_user_details_from_department_data(email_id)
    if user_details:
        return user_details.get("Designation")
    return None

def get_reports_for_manager(manager_email: str) -> List[Dict[str, Any]]:
    """
    Fetches all individuals (direct employees, Zonal Managers, and their direct reports)
    who report up to the given manager_email.
    """
    managed_individuals = []
    manager_details = get_user_details_from_department_data(manager_email)
    if not manager_details or manager_details.get("Designation") not in ["Reporting manager", "Zonal Managers"]:
        return [] # Not a manager or not found

    manager_name = manager_details.get("Name")

    for dept_name, teams in DEPARTMENT_DATA.items():
        for team_name, members in teams.items():
            for member in members:
                # Direct reports to a Reporting Manager or Zonal Manager
                if member.get("Reviewer") == manager_name:
                    managed_individuals.append(member)
                    # If this direct report is a Zonal Manager, get their direct reports too
                    if member.get("Designation") == "Zonal Managers":
                        # Recursive call to get reports for the Zonal Manager
                        # This ensures that employees under Zonal Managers are also included
                        # when a Reporting Manager higher up requests the report.
                        zonal_manager_direct_reports = []
                        for sub_member in members: # search within the same team for ZM's reports
                            if sub_member.get("Reviewer") == member.get("Name") and sub_member.get("Designation") == "Employee":
                                zonal_manager_direct_reports.append(sub_member)
                        # Or, more broadly, search everywhere, but this might be too wide:
                        # zonal_manager_reports = get_reports_for_manager(member.get("Email ID"))
                        # For now, let's assume Zonal Manager's reports are within their listed team or linked by "Reviewer" field.
                        # The original get_reports_for_manager might be too broad if called recursively without tight scope.
                        # Let's refine to get direct reports for a ZM specifically.

                        # Simplified: get employees whose reviewer is this Zonal Manager's Name
                        for d_name, ts in DEPARTMENT_DATA.items():
                            for t_name, ms in ts.items():
                                for m_person in ms:
                                    if m_person.get("Reviewer") == member.get("Name") and m_person.get("Designation") == "Employee":
                                        if m_person not in managed_individuals: # Avoid duplicates
                                            managed_individuals.append(m_person)

    # Remove duplicates that might occur if a Zonal Manager is listed and also processed recursively
    unique_individuals = []
    seen_emails = set()
    for individual in managed_individuals:
        individual_email = individual.get("Email ID")
        if individual_email and individual_email not in seen_emails:
            unique_individuals.append(individual)
            seen_emails.add(individual_email)

    return unique_individuals


def get_all_employee_emails_under_manager(manager_email: str) -> List[str]:
    """
    Recursively gets all employee emails (Designation: "Employee") under a manager,
    including those under Zonal Managers who report to this manager.
    """
    all_employee_emails = []

    manager_details = get_user_details_from_department_data(manager_email)
    if not manager_details:
        logging.warning(f"Manager with email {manager_email} not found in DEPARTMENT_DATA.")
        return []

    manager_name = manager_details["Name"]

    # Iterate through all departments and teams to find direct reports
    for dept_name, teams in DEPARTMENT_DATA.items():
        for team_name, members in teams.items():
            for member in members:
                # Check if the member reports to the current manager_name
                if member.get("Reviewer") == manager_name:
                    member_email = member.get("Email ID")
                    member_designation = member.get("Designation")

                    if not member_email: continue # Skip if no email

                    if member_designation == "Employee":
                        if member_email not in all_employee_emails:
                            all_employee_emails.append(member_email)
                    elif member_designation == "Zonal Managers":
                        # Recursively get employees under this Zonal Manager
                        employees_under_zm = get_all_employee_emails_under_manager(member_email)
                        for emp_email in employees_under_zm:
                            if emp_email not in all_employee_emails:
                                all_employee_emails.append(emp_email)
                    # We are only collecting 'Employee' emails for task aggregation.
                    # Reporting Managers and Zonal Managers themselves are handled by who is viewing the report.

    return list(set(all_employee_emails)) # Ensure uniqueness

# Department and team data with new structure
DEPARTMENT_DATA = {
  "Research": {
    "Research": [
      {
        "Name": "P. Srinath Rao",
        "Designation": "Reporting manager",
        "Reviewer": "Alimpan Banerjee , Anant Tiwari",
        "Email ID": "srinath@showtimeconsulting.in"
      },
      {
        "Name": "Aparna Jyothi",
        "Designation": "Employee",
        "Reviewer": "P. Srinath Rao",
        "Email ID": "aparnajyothi@showtimeconsulting.in"
      },
      {
        "Name": "Rishitha",
        "Designation": "Employee",
        "Reviewer": "P. Srinath Rao",
        "Email ID": "rishitha.p@showtimeconsulting.in"
      }
    ]
  },
  "Media": {
    "Media": [
      {
        "Name": "Aakansha Tandon",
        "Designation": "Reporting manager",
        "Reviewer": "Anant Tiwari",
        "Email ID": "aakansha.tandon@showtimeconsulting.in"
      },
      {
        "Name": "Gatika Akhil varma",
        "Designation": "Employee",
        "Reviewer": "Aakansha Tandon",
        "Email ID": "akhil.varma@showtimeconsulting.in"
      },
      {
        "Name": "Manikantha Badhada",
        "Designation": "Employee",
        "Reviewer": "Aakansha Tandon",
        "Email ID": "manikantha.badhada@showtimeconsulting.in"
      },
      {
        "Name": "Sambasiva Rao",
        "Designation": "Employee",
        "Reviewer": "Aakansha Tandon",
        "Email ID": "samba@showtimeconsulting.in"
      },
      {
        "Name": "Sunil Chandra Byrisetti",
        "Designation": "Employee",
        "Reviewer": "Aakansha Tandon",
        "Email ID": "sunil.byrisetti@showtimeconsulting.in"
      },
      {
        "Name": "Geddam Ravi prakash",
        "Designation": "Employee",
        "Reviewer": "Aakansha Tandon",
        "Email ID": "ravi.prakash@showtimeconsulting.in"
      },
      {
        "Name": "Velpula Bharath Kumar",
        "Designation": "Employee",
        "Reviewer": "Aakansha Tandon",
        "Email ID": "bharath.kumar@showtimeconsulting.in"
      }
    ]
  },
  "Data": {
    "Data": [
      {
        "Name": "T.Pardhasaradhi",
        "Designation": "Reporting manager",
        "Reviewer": "Anant Tiwari",
        "Email ID": "pardhasaradhi@showtimeconsulting.in"
      },
      {
        "Name": "Bantu Kavya sri",
        "Designation": "Employee",
        "Reviewer": "T.Pardhasaradhi",
        "Email ID": "kavya.sri@showtimeconsulting.in"
      },
      {
        "Name": "Manohar Bomminayuni",
        "Designation": "Employee",
        "Reviewer": "T.Pardhasaradhi",
        "Email ID": "manoharbomminayuni@showtimeconsulting.in"
      },
      {
        "Name": "M Niveditha",
        "Designation": "Employee",
        "Reviewer": "T.Pardhasaradhi",
        "Email ID": "niveditha@showtimeconsulting.in"
      },
      {
        "Name": "Mopuri Mounika",
        "Designation": "Employee",
        "Reviewer": "T.Pardhasaradhi",
        "Email ID": "mounikamopuri@showtimeconsulting.in"
      },
      {
        "Name": "Vidya Kolati",
        "Designation": "Employee",
        "Reviewer": "T.Pardhasaradhi",
        "Email ID": "vidya.kolati@showtimeconsulting.in"
      },
      {
        "Name": "Vishal Kumar",
        "Designation": "Employee",
        "Reviewer": "T. Pardhasaradhi",
        "Email ID": "vishal.kumar@showtimeconsulting.in"
      },
      {
        "Name": "Aditya Prakash",
        "Designation": "Employee",
        "Reviewer": "T.Pardhasaradhi",
        "Email ID": "aditya.prakash@showtimeconsulting.in"
      }
    ]
  },
  "DMC": {
    "Digital Production": [
      {
        "Name": "Bapan Kumar Chanda",
        "Designation": "Reporting manager",
        "Reviewer": "Anant Tiwari",
        "Email ID": "bapankumarchanda@showtimeconsulting.in"
      },
      {
        "Name": "Mahesh Yadav",
        "Designation": "Employee",
        "Reviewer": "Bapan Kumar Chanda",
        "Email ID": "mahesh.yadav@showtimeconsulting.in"
      },
      {
        "Name": "Venkataramana Suram",
        "Designation": "Employee",
        "Reviewer": "Bapan Kumar Chanda",
        "Email ID": "venkataramana@showtimeconsulting.in"
      },
      {
        "Name": "Kumarraja Draksharapu",
        "Designation": "Employee",
        "Reviewer": "Bapan Kumar Chanda",
        "Email ID": "kumarraja.draksharapu@showtimeconsulting.in"
      },
      {
        "Name": "Pankaj Koranga",
        "Designation": "Employee",
        "Reviewer": "Bapan Kumar Chanda",
        "Email ID": "pankaj.koranga@showtimeconsulting.in"
      },
      {
        "Name": "Ankit Kashyap",
        "Designation": "Employee",
        "Reviewer": "Bapan Kumar Chanda",
        "Email ID": "ankit.kashyap@showtimeconsulting.in"
      },
      {
        "Name": "Chandra Sarthik",
        "Designation": "Employee",
        "Reviewer": "Bapan Kumar Chanda",
        "Email ID": "sarthik.chandra@showtimeconsulting.in"
      },
      {
        "Name": "Vamsi Vallamkonda",
        "Designation": "Employee",
        "Reviewer": "Bapan Kumar Chanda",
        "Email ID": "Vamsi.vallamkonda@showtimeconsulting.in"
      },
      {
        "Name": "Sumedh Zode",
        "Designation": "Employee",
        "Reviewer": "Bapan Kumar Chanda",
        "Email ID": "sumedh.zode@showtimeconsulting.in"
      },
      {
        "Name": "DEVBRAT KUMAR YADAV",
        "Designation": "Employee",
        "Reviewer": "Bapan Kumar Chanda",
        "Email ID": "devbrat.kumar@showtimeconsulting.in"
      },
      {
        "Name": "Surya Chandu Netti",
        "Designation": "Employee",
        "Reviewer": "Bapan Kumar Chanda",
        "Email ID": "surya.chandu@showtimeconsulting.in"
      },
      {
        "Name": "Kiran Thumpera",
        "Designation": "Employee",
        "Reviewer": "Bapan Kumar Chanda",
        "Email ID": "kiran.thumpere@showtimeconsulting.in"
      },
      {
        "Name": "V Sumanth",
        "Designation": "Employee",
        "Reviewer": "Bapan Kumar Chanda",
        "Email ID": "sumanth@showtimeconsulting.in"
      },
      {
        "Name": "Karthik Upadhyayula",
        "Designation": "Employee",
        "Reviewer": "Bapan Kumar Chanda",
        "Email ID": "karthik.upadhyayula@showtimeconsulting.in"
      },
      {
        "Name": "Vullangi pranay teja",
        "Designation": "Employee",
        "Reviewer": "Bapan Kumar Chanda",
        "Email ID": "pranay.teja@showtimeconsulting.in"
      },
      {
        "Name": "Arun S",
        "Designation": "Employee",
        "Reviewer": "Bapan Kumar Chanda",
        "Email ID": "arun.s@showtimeconsulting.in"
      }
    ],
    "Digital Communication": [
      {
        "Name": "Keerthana Sampath",
        "Designation": "Reporting manager",
        "Reviewer": "Anant Tiwari",
        "Email ID": "keerthana.sampath@showtimeconsulting.in"
      },
      {
        "Name": "Rekulapally Saichand",
        "Designation": "Employee",
        "Reviewer": "Keerthana Sampath",
        "Email ID": "sai.chand@showtimeconsulting.in"
      },
      {
        "Name": "Abhijit Sharma",
        "Designation": "Employee",
        "Reviewer": "Keerthana Sampath",
        "Email ID": "abhijit@showtimeconsulting.in"
      },
      {
        "Name": "Ramesh Jiledumudi",
        "Designation": "Employee",
        "Reviewer": "Keerthana Sampath",
        "Email ID": "ramesh@showtimeconsulting.in"
      },
      {
        "Name": "Upender Sangishetti",
        "Designation": "Employee",
        "Reviewer": "Keerthana Sampath",
        "Email ID": "upender@showtimeconsulting.in"
      },
      {
        "Name": "SRINATH RAVULAPALLI",
        "Designation": "Employee",
        "Reviewer": "Keerthana Sampath",
        "Email ID": "srinath.ravulapalli@showtimeconsulting.in"
      },
      {
        "Name": "Saiteja Ganeswarapu",
        "Designation": "Employee",
        "Reviewer": "Keerthana Sampath",
        "Email ID": "saiteja@showtimeconsulting.in"
      }
    ],
    "Propagation": [
      {
        "Name": "Lokesh Mathur",
        "Designation": "Reporting manager",
        "Reviewer": "Anant Tiwari",
        "Email ID": "lokesh.mathur@showtimeconsulting.in"
      },
      {
        "Name": "Naren Krishna",
        "Designation": "Employee",
        "Reviewer": "Lokesh Mathur",
        "Email ID": "naren.krishna@showtimeconsulting.in"
      },
      {
        "Name": "PRAKASH KONDA",
        "Designation": "Employee",
        "Reviewer": "Lokesh Mathur",
        "Email ID": "prakash.konda@showtimeconsulting.in"
      }
    ],
    "Neagitive Propagation": [
      {
        "Name": "Keshav Mishra",
        "Designation": "Reporting manager",
        "Reviewer": "Anant Tiwari",
        "Email ID": "keshav@showtimeconsulting.in"
      }
    ],
    "Digital Marketing/Networking": [
     {
        "Name": "Sumita Singh",
        "Designation": "Reporting manager",
        "Reviewer": "Saumitra, Anurag",
        "Email ID": "sumita.singh@showtimeconsulting.in"
     },
     {
        "Name": "Veera Swamy Yerraboyina",
        "Designation": "Employee",
        "Reviewer": "Sumita Singh",
        "Email ID": "veera.swamy@showtimeconsulting.in"
      }
    ],
    "HIVE": [
      {
        "Name": "Madhunisha",
        "Designation": "Reporting manager",
        "Reviewer": "Anant Tiwari",
        "Email ID": "madhunisha@showtimeconsulting.in"
      },
      {
        "Name": "Apoorva Singh",
        "Designation": "Reporting manager",
        "Reviewer": "Anant Tiwari",
        "Email ID": "apoorva@showtimeconsulting.in"
      }
    ]
  },
  "Campaign": {
    "Campaign": [
      {
        "Name": "Manoharan",
        "Designation": "Reporting manager",
        "Reviewer": "Anant Tiwari, Alimpan Banerjee",
        "Email ID": "manoharan@showtimeconsulting.in"
      },
      {
        "Name": "Gowtham Ch",
        "Designation": "Employee",
        "Reviewer": "Manoharan",
        "Email ID": "gowtham@showtimeconsulting.in"
      },
      {
        "Name": "Sanjay Jonnalagadda",
        "Designation": "Employee",
        "Reviewer": "Manoharan",
        "Email ID": "sanjay.jonnalagadda@showtimeconsulting.in"
      },
      {
        "Name": "Shahzad Anjum",
        "Designation": "Employee",
        "Reviewer": "Manoharan",
        "Email ID": "shahzad.anjum@showtimeconsulting.in"
      },
      {
        "Name": "Ramanagasai Pasyavula",
        "Designation": "Employee",
        "Reviewer": "Manoharan",
        "Email ID": "ramanagasai.pasyavula@showtimeconsulting.in"
      }
    ]
  },
  "Soul Central": {
    "Soul Central": [
      {
        "Name": "Atia Latif",
        "Designation": "Reporting manager",
        "Reviewer": "Alimpan Banerjee",
        "Email ID": "atia@showtimeconsulting.in"
      },
      {
        "Name": "Bharavi Yadav",
        "Designation": "Employee",
        "Reviewer": "Atia Latif",
        "Email ID": "bharavi.yadav@showtimeconsulting.in"
      },
      {
        "Name": "Kanhaiya Jha",
        "Designation": "Employee",
        "Reviewer": "Atia Latif",
        "Email ID": "kanhaiya@showtimeconsulting.in"
      },
      {
        "Name": "Dendi Brundha",
        "Designation": "Employee",
        "Reviewer": "Atia Latif",
        "Email ID": "dendi.brundha@showtimeconsulting.in"
      },
      {
        "Name": "Sai Deeksha Challa",
        "Designation": "Employee",
        "Reviewer": "Atia Latif",
        "Email ID": "deeksha.challa@showtimeconsulting.in"
      },
      {
        "Name": "Mahammad Mahamood",
        "Designation": "Employee",
        "Reviewer": "Atia Latif",
        "Email ID": "mahamood.mahammad@showtimeconsulting.in"
      },
      {
        "Name": "Harishwar Bhanuru",
        "Designation": "Employee",
        "Reviewer": "Atia Latif",
        "Email ID": "harishwar.bhanuru@showtimeconsulting.in"
      }
    ],
    "Field Team AP-1": [
      {
        "Name": "Akhilesh Mishra",
        "Designation": "Reporting manager",
        "Reviewer": "Alimpan Banerjee",
        "Email ID": "akhilesh@showtimeconsulting.in"
      },
      {
        "Name": "Lokesh Reddy",
        "Designation": "Zonal Managers",
        "Reviewer": "Akhilesh Mishra",
        "Email ID": "lokeshreddy@showtimeconsulting.in"
      },
      {
        "Name": "Vamshi Vardhan",
        "Designation": "Zonal Managers",
        "Reviewer": "Akhilesh Mishra",
        "Email ID": "vamshi.vardhan@showtimeconsulting.in"
      },
      {
        "Name": "Sai Madan",
        "Designation": "Zonal Managers",
        "Reviewer": "Akhilesh Mishra",
        "Email ID": "Sai.madan@showtimeconsulting.in"
      },
      {
        "Name": "Sashidhar Betha",
        "Designation": "Employee",
        "Reviewer": "Vamshi Vardhan",
        "Email ID": "sai.shashidhar@showtimeconsulting.in"
      },
      {
        "Name": "Sai Akula",
        "Designation": "Employee",
        "Reviewer": "Vamshi Vardhan",
        "Email ID": "saikumar.akula@showtimeconsulting.in"
      },
      {
        "Name": "Sashi Malothu",
        "Designation": "Employee",
        "Reviewer": "Alimpan Banerjee",
        "Email ID": "shashi@showtimeconsulting.in"
      },
      {
        "Name": "Vivekanand",
        "Designation": "Employee",
        "Reviewer": "Vamshi Vardhan",
        "Email ID": "vivekananda@showtimeconsulting.in"
      },
      {
        "Name": "BATHINI AVINASH",
        "Designation": "Employee",
        "Reviewer": "Lokesh Reddy",
        "Email ID": "avinash.bathini@showtimeconsulting.in"
      },
      {
        "Name": "VUIKA PHANINDRA",
        "Designation": "Employee",
        "Reviewer": "Vamshi Vardhan",
        "Email ID": "phanindra.vuika@showtimeconsulting.in"
      },
      {
        "Name": "Puvvadi Vinod Kumar",
        "Designation": "Employee",
        "Reviewer": "Lokesh Reddy",
        "Email ID": "vinod.kumar@showtimeconsulting.in"
      },
      {
        "Name": "S Venkatesh",
        "Designation": "Employee",
        "Reviewer": "Lokesh Reddy",
        "Email ID": "venkatesh.s@showtimeconsulting.in"
      },
      {
        "Name": "Prathipati Chaitanya",
        "Designation": "Employee",
        "Reviewer": "Sai Madan",
        "Email ID": "chaitanya.p@showtimeconsulting.in"
      },
      {
        "Name": "Anand",
        "Designation": "Employee",
        "Reviewer": "Sai Madan",
        "Email ID": "anand@showtimeconsulting.in"
      },
      {
        "Name": "Anudeep G",
        "Designation": "Employee",
        "Reviewer": "Vamshi Vardhan",
        "Email ID": "anudeep@showtimeconsulting.in"
      }
    ],
    "Field Team AP-2": [
      {
        "Name": "Siddharth Gautam",
        "Designation": "Reporting manager",
        "Reviewer": "Alimpan Banerjee",
        "Email ID": "siddharthag@showtimeconsulting.in"
      },
      {
        "Name": "Kiran Ponnoju",
        "Designation": "Zonal Managers",
        "Reviewer": "Siddharth Gautam",
        "Email ID": "kiranponnoju@showtimeconsulting.in"
      },
      {
        "Name": "Muneer",
        "Designation": "Zonal Managers",
        "Reviewer": "Siddharth Gautam",
        "Email ID": "pma@showtimeconsulting.in"
      },
      {
        "Name": "Ghilman Wajid",
        "Designation": "Zonal Managers",
        "Reviewer": "Siddharth Gautam",
        "Email ID": "ghilman.wajid@showtimeconsulting.in"
      },
      {
        "Name": "Gajella Pranav Raj",
        "Designation": "Zonal Managers",
        "Reviewer": "Siddharth Gautam",
        "Email ID": "pranavgajjela@showtimeconsulting.in"
      },
      {
        "Name": "Nikhil Kumar",
        "Designation": "Zonal Managers",
        "Reviewer": "Siddharth Gautam",
        "Email ID": "nikhil.kumar@showtimeconsulting.in"
      },
      {
        "Name": "Bharni Kumar Kasi",
        "Designation": "Employee",
        "Reviewer": "Muneer",
        "Email ID": "bharani.kasi@showtimeconsulting.in"
      },
      {
        "Name": "Guda Vishwanath Reddy",
        "Designation": "Employee",
        "Reviewer": "Muneer",
        "Email ID": "viswanatha@showtimeconsulting.in"
      },
      {
        "Name": "Praveen",
        "Designation": "Employee",
        "Reviewer": "Muneer",
        "Email ID": "praveen.maniyari@showtimeconsulting.in"
      },
      {
        "Name": "K Teja Kumar",
        "Designation": "Employee",
        "Reviewer": "Muneer",
        "Email ID": "tejakaredla@showtimeconsulting.in"
      },
      {
        "Name": "Md Shoaib Ahmed",
        "Designation": "Employee",
        "Reviewer": "Kiran Ponnoju",
        "Email ID": "shoaib.ahmed@showtimeconsulting.in"
      },
      {
        "Name": "Srinivas",
        "Designation": "Employee",
        "Reviewer": "Kiran Ponnoju",
        "Email ID": "srinivasa@showtimeconsulting.in"
      },
      {
        "Name": "Jajula Ramalingeswar",
        "Designation": "Employee",
        "Reviewer": "Ghilman Wajid",
        "Email ID": "rama.lingeswararao@showtimeconsulting.in"
      },
      {
        "Name": "Mahendra Koduru",
        "Designation": "Employee",
        "Reviewer": "Ghilman Wajid",
        "Email ID": "mahendra@showtimeconsulting.in"
      },
      {
        "Name": "Vangari Sai Kiran",
        "Designation": "Employee",
        "Reviewer": "Ghilman Wajid",
        "Email ID": "sai.kiran@showtimeconsulting.in"
      },
      {
        "Name": "Banoth Nagendra",
        "Designation": "Employee",
        "Reviewer": "Gajella Pranav Raj",
        "Email ID": "banoth.nagendra@showtimeconsulting.in"
      },
      {
        "Name": "Jetti Yashwanth Kumar",
        "Designation": "Employee",
        "Reviewer": "Gajella Pranav Raj",
        "Email ID": "jetti.yeswanth@showtimeconsulting.in"
      },
      {
        "Name": "Konkola Vishnu Vardhan Reddy",
        "Designation": "Employee",
        "Reviewer": "Nikhil Kumar",
        "Email ID": "vishnu.vardhan@showtimeconsulting.in"
      },
      {
        "Name": "Kishore Banka",
        "Designation": "Employee",
        "Reviewer": "Nikhil Kumar",
        "Email ID": "kishor.banka@showtimeconsulting.in"
      },
      {
        "Name": "Praharaju Viswa Varun",
        "Designation": "Employee",
        "Reviewer": "Muneer",
        "Email ID": "viswa.varun@showtimeconsulting.in"
      },
      {
        "Name": "Shiva Vardhan Singireddy",
        "Designation": "Employee",
        "Reviewer": "Gajella Pranav Raj",
        "Email ID": "shiva.vardhan@showtimeconsulting.in"
      }
    ],
    "Field Team TG" : [
        {
            "Name": "Gurram Saikiran",
            "Designation": "Reporting manager",
            "Reviewer": "Alimpan Banerjee",
            "Email ID": "gurram.saikiran@showtimeconsulting.in"
        },
        {
            "Name": "Perka Shivaji",
            "Designation": "Employee",
            "Reviewer": "Gurram Saikiran",
            "Email ID": "perka@showtimeconsulting.in"
        },
        {
            "Name": "Chitrala Vijay Kumar",
            "Designation": "Employee",
            "Reviewer": "Gurram Saikiran",
            "Email ID": "vijay.kumar@showtimeconsulting.in"
        },
        {
            "Name": "Sumanth Vempati",
            "Designation": "Employee",
            "Reviewer": "Gurram Saikiran",
            "Email ID": "sumanth.vempati@showtimeconsulting.in"
        }
    ],
    "PMU": [
      {
        "Name": "Aditya Pandit",
        "Designation": "Reporting manager",
        "Reviewer": "Alimpan Banerjee",
        "Email ID": "aditya.pandit@showtimeconsulting.in"
      },
      {
        "Name": "Yasaswinath",
        "Designation": "Employee",
        "Reviewer": "Aditya Pandit",
        "Email ID": "yasaswinath@showtimeconsulting.in"
      },
      {
        "Name": "Bharavi Yadav",
        "Designation": "Employee",
        "Reviewer": "Aditya Pandit",
        "Email ID": "bharavi.yadav@showtimeconsulting.in"
      },
      {
        "Name": "M Farhan",
        "Designation": "Employee",
        "Reviewer": "Aditya Pandit",
        "Email ID": "farhan.m@showtimeconsulting.in"
      },
      {
        "Name": "Sauharda",
        "Designation": "Employee",
        "Reviewer": "Aditya Pandit",
        "Email ID": "sauharda@showtimeconsulting.in"
      }
    ]
  },
  "Directors team": {
    "Directors Team-1": [
      {
        "Name": "Himani Sehgal",
        "Designation": "Reporting manager",
        "Reviewer": "Anant Tiwari, Alimpan Banerjee",
        "Email ID": "himani.sehgal@showtimeconsulting.in"
      },
      {
        "Name": "Amujuru Maheswar",
        "Designation": "Employee",
        "Reviewer": "Himani Sehgal",
        "Email ID": "amujuru.maheswar@showtimeconsulting.in"
      },
      {
        "Name": "Bhawna Shraddha",
        "Designation": "Employee",
        "Reviewer": "Himani Sehgal",
        "Email ID": "bhawna.shraddha@showtimeconsulting.in"
      },
      {
        "Name": "Rajvardhan Singh",
        "Designation": "Employee",
        "Reviewer": "Himani Sehgal",
        "Email ID": "rajvardhan.singh@showtimeconsulting.in"
      },
      {
        "Name": "Jishin Chand K C",
        "Designation": "Employee",
        "Reviewer": "Himani Sehgal",
        "Email ID": "jishin.chand@showtimeconsulting.in"
      },
      {
        "Name": "Milap Jiu Basumatary",
        "Designation": "Employee",
        "Reviewer": "Himani Sehgal",
        "Email ID": "milap.jiu@showtimeconsulting.in"
      },
      {
        "Name": "Vishnuvardhan Vanga",
        "Designation": "Employee",
        "Reviewer": "Himani Sehgal",
        "Email ID": "vishnuvardhan.vanga@showtimeconsulting.in"
      },
      { 
        "Name": "Vishal Kumar",
        "Designation": "Employee",
        "Reviewer": "Himani Sehgal",
        "Email ID": "vishal.kumar@showtimeconsulting.in"
      }   
    ],
    "Directors Team-2": [
      {
        "Name": "Pawan Beniwal",
        "Designation": "Reporting manager",
        "Reviewer": "Anant Tiwari, Alimpan Banerjee",
        "Email ID": "pawan.beniwal@showtimeconsulting.in"
      },
      {
        "Name": "V Sachivendra Yaska",
        "Designation": "Employee",
        "Reviewer": "Pawan Beniwal",
        "Email ID": "sachivendra.yaska@showtimeconsulting.in"
      },
      {
        "Name": "B Vanlalruatfela",
        "Designation": "Employee",
        "Reviewer": "Pawan Beniwal",
        "Email ID": "vanlalruatfela@showtimeconsulting.in"
      },
      {
        "Name": "Himanshu Mann",
        "Designation": "Employee",
        "Reviewer": "Pawan Beniwal",
        "Email ID": "himanshu.mann@showtimeconsulting.in"
      }
    ],
    "Directors Team-3": [
      {
        "Name": "Sabavat Eshwar Naik",
        "Designation": "Reporting manager",
        "Reviewer": "Anant Tiwari, Alimpan Banerjee",
        "Email ID": "sabavat.eshwar@showtimeconsulting.in"
      },
      {
        "Name": "Challa Sravya",
        "Designation": "Reporting manager",
        "Reviewer": "Anant Tiwari, Alimpan Banerjee",
        "Email ID": "challa.sravya@showtimeconsulting.in"
      }
    ]
  },
  "HR": {
    "HR": [
      {
        "Name": "Tejaswini CH",
        "Designation": "Reporting manager",
        "Reviewer": "Robbin Sharma, Anant Tiwari, Alimpan Banerjee, Khushboo Sharma",
        "Email ID": "tejaswini@showtimeconsulting.in"
      },
      {
        "Name": "V.Shashidhar Kumar",
        "Designation": "Employee",
        "Reviewer": "Tejaswini CH",
        "Email ID": "shashidhar.kumar@showtimeconsulting.in"
      },
      {
        "Name": "Varun Reddy",
        "Designation": "Employee",
        "Reviewer": "Tejaswini CH",
        "Email ID": "Varun.tej@showtimeconsulting.in"
      },
      {
          "Name": "Sudipta Gupta",
          "Designation": "Reporting manager",
          "Reviewer": "Directors",
          "Email ID": "sudipta.gupta@showtimeconsulting.in"
      },
      {
          "Name": "Roopesh",
          "Designation": "Employee",
          "Reviewer": "Sudipta Gupta",
          "Email ID": "roopesh.roopesh@showtimeconsulting.in"       
      }        
    ]
  },
  "Admin": {
    "Operations": [
      {
        "Name": "Nikash Kumar",
        "Designation": "Reporting manager",
        "Reviewer": "Robbin Sharma, Anant Tiwari, Alimpan Banerjee, Khushboo Sharma",
        "Email ID": "nikash.kumar@showtimeconsulting.in"
      },
      {
        "Name": "Dharma Siva Sai Naik",
        "Designation": "Employee",
        "Reviewer": "Nikash Kumar",
        "Email ID": "dharma@showtimeconsulting.in"
      },
      {
        "Name": "Yash Malhotra",
        "Designation": "Employee",
        "Reviewer": "Nikash Kumar",
        "Email ID": "yash@showtimeconsulting.in"
      },
      {
        "Name": "Rajkumar Koner",
        "Designation":"Employee",
        "Reviewer": "Nikash Kumar",
        "Email ID": "rajkumar@showtimeconsulting.in"
       },
       {
        "Name": "Sandeep Pal",
        "Designation": "Employee",
        "Reviewer": "Nikash Kumar",
        "Email ID": "sandeep.pal@showtimeconsulting.in"
       }
    ]
  }
}
# The MANAGER_RESOURCES dictionary is now obsolete with the new DEPARTMENT_DATA structure.
# Resource counts and manager roles will be derived dynamically from DEPARTMENT_DATA.
# We will remove or comment out MANAGER_RESOURCES.
# MANAGER_RESOURCES = {} # Or comment out completely

STATUS_OPTIONS = ["WIP", "Completed", "Yet to Start", "Delayed"]

# Predefined users with actual company data - Rebuilt from DEPARTMENT_DATA
PREDEFINED_USERS = []
_processed_emails_for_predefined_users = set()

for _dept_name, _teams in DEPARTMENT_DATA.items():
    for _team_name, _members in _teams.items():
        for _member in _members:
            _email = _member.get("Email ID")
            if not _email or _email in _processed_emails_for_predefined_users:
                continue  # Skip if no email or already processed

            _role = "employee"  # Default
            _designation = _member.get("Designation", "Employee")
            if _designation == "Reporting manager" or _designation == "Zonal Managers":
                _role = "manager"

            # Clean up potential newline characters in email (observed in one entry)
            _email = _email.strip()

            _user_entry = {
                "name": _member["Name"],
                "email": _email,
                "password": "Welcome@123",  # Standard password
                "role": _role,
                "department": _dept_name,
                "team": _team_name
            }
            PREDEFINED_USERS.append(_user_entry)
            _processed_emails_for_predefined_users.add(_email)

# Add any system-critical users not in DEPARTMENT_DATA if necessary
# Ensure admin user is added with 'admin' role
admin_email = "admin@showtimeconsulting.in"
if not any(user["email"] == admin_email for user in PREDEFINED_USERS):
    PREDEFINED_USERS.append({
        "name": "Portal Admin",
        "email": admin_email,
        "password": "Welcome@123", # Default password
        "role": "admin",
        "department": "System", # Or appropriate values
        "team": "Administration" # Or appropriate values
    })
    _processed_emails_for_predefined_users.add(admin_email) # Ensure it's tracked if init_database uses this set


# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    password_hash: str
    role: str  # "manager" or "employee"
    department: str = ""
    team: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(pytz.timezone('Asia/Kolkata')))
    reset_password_token: Optional[str] = None
    reset_password_expires: Optional[datetime] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "employee"  # Default to employee
    department: str = ""
    team: str = ""

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    department: str = ""
    team: str = ""

class RequestPasswordResetPayload(BaseModel):
    email: EmailStr

class ResetPasswordPayload(BaseModel):
    token: str
    new_password: str

class ChangePasswordPayload(BaseModel):
    current_password: str
    new_password: str

class Task(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    details: str
    status: str

class WorkReport(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_name: str
    employee_email: str
    department: str
    team: str
    reporting_manager: str
    date: str
    tasks: List[Task]
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(pytz.timezone('Asia/Kolkata')))
    last_modified_at: datetime = Field(default_factory=lambda: datetime.now(pytz.timezone('Asia/Kolkata')))
    last_modified_by: str = ""

class WorkReportCreate(BaseModel):
    employee_name: str
    department: str
    team: str
    reporting_manager: str
    date: str
    tasks: List[Task]

class WorkReportUpdate(BaseModel):
    tasks: List[Task]

class SummaryReportTask(BaseModel):
    details: str
    status: str

class SummaryTaskDetail(BaseModel):
    details: str
    # Status is implied by the parent key in tasks_by_status

class SummaryReportGroup(BaseModel):
    department: str
    team: str
    reporting_manager: str # This is the manager in charge of the team/group
    no_of_resource: int
    tasks_by_status: Dict[str, List[SummaryTaskDetail]] = Field(default_factory=dict)
    reviewer: Optional[str] = None # This is Alimpan or Anant

# Security setup
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"

# IST timezone
IST = pytz.timezone('Asia/Kolkata')

# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None

# Helper function to convert MongoDB document to dict with proper ObjectId handling
def convert_mongo_doc(doc):
    if doc is None:
        return None
    
    doc_dict = dict(doc)
    
    # Convert ObjectId to string
    if '_id' in doc_dict:
        doc_dict['_id'] = str(doc_dict['_id'])
    
    return doc_dict

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        user = await db.users.find_one({"email": payload.get("sub")})
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Convert MongoDB document to dict with proper ObjectId handling
        user_dict = convert_mongo_doc(user)
        return UserResponse(**user_dict)
    except Exception as e:
        logging.error(f"Error getting current user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service temporarily unavailable"
        )

# Initialize database with predefined users
async def init_database():
    try:
        # Check if users already exist
        user_count = await db.users.count_documents({})
        if user_count == 0:
            # Insert predefined users
            users_to_insert = []
            for user_data in PREDEFINED_USERS:
                user = User(
                    name=user_data["name"],
                    email=user_data["email"],
                    password_hash=hash_password(user_data["password"]),
                    role=user_data["role"],
                    department=user_data.get("department", ""),
                    team=user_data.get("team", "")
                )
                users_to_insert.append(user.dict())
            
            if users_to_insert: # Ensure there's something to insert
                await db.users.insert_many(users_to_insert)
            print("Database initialized with predefined users")
        else:
            # Process all users from PREDEFINED_USERS (derived from DEPARTMENT_DATA)
            # This loop will either create new users or update existing ones if necessary.
            for user_data in PREDEFINED_USERS:
                existing_user = await db.users.find_one({"email": user_data["email"]})

                if existing_user:
                    # User exists, check if department or team info is missing or needs update
                    update_fields = {}
                    if not existing_user.get("department") and user_data.get("department"):
                        update_fields["department"] = user_data["department"]
                    if not existing_user.get("team") and user_data.get("team"):
                        update_fields["team"] = user_data["team"]

                    # Potentially update role if it's a generic 'employee' and DEPARTMENT_DATA suggests 'manager'
                    # This part is delicate: avoid demoting manually assigned higher roles.
                    # For now, let's only set role if it's not set or to upgrade from employee to manager if data says so.
                    # And ensure that if current role is 'manager', it is not changed to 'employee' by this script.
                    if user_data.get("role") == "manager" and existing_user.get("role") == "employee":
                         update_fields["role"] = "manager"
                    elif not existing_user.get("role") and user_data.get("role"): # If role is not set at all
                        update_fields["role"] = user_data.get("role")


                    if update_fields:
                        await db.users.update_one(
                            {"email": user_data["email"]},
                            {"$set": update_fields}
                        )
                        print(f"Updated existing user {user_data['email']} with fields: {list(update_fields.keys())}")
                else:
                    # User does not exist, create them
                    new_user = User(
                        name=user_data["name"],
                        email=user_data["email"],
                        password_hash=hash_password(user_data["password"]), # Default password
                        role=user_data["role"],
                        department=user_data.get("department", ""),
                        team=user_data.get("team", "")
                    )
                    await db.users.insert_one(new_user.dict())
                    print(f"Created new user: {new_user.email} with role {new_user.role}")

            # Message after processing all predefined users if DB wasn't empty initially
            print("Database checked and updated/created users as per DEPARTMENT_DATA.")

    except Exception as e:
        print(f"Database initialization error: {str(e)}")

# Lifespan event handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        await init_database()
        print("Application started successfully")
    except Exception as e:
        print(f"Startup error: {str(e)}")
    yield
    # Shutdown
    try:
        if client: # Ensure client exists before trying to close
            client.close()
            print("Database connection closed")
    except Exception as e:
        print(f"Shutdown error: {str(e)}")

# Create the main app with lifespan
app = FastAPI(
    title="Daily Work Reporting Portal API", 
    version="1.0.0",
    lifespan=lifespan
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# CORS configuration
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@api_router.get("/health")
async def health_check():
    try:
        # Test database connection
        count = await db.users.count_documents({})
        return {
            "status": "healthy", 
            "database": "connected",
            "users_count": count,
            "departments_available": len(DEPARTMENT_DATA)
        }
    except Exception as e:
        return {
            "status": "unhealthy", 
            "error": str(e),
            "database": "disconnected"
        }

# Routes
@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    try:
        user = await db.users.find_one({"email": user_data.email})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        if not verify_password(user_data.password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password"
            )
        
        # Convert MongoDB document to dict with proper ObjectId handling
        user_dict = convert_mongo_doc(user)
        
        access_token = create_access_token(data={"sub": user["email"]})
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": UserResponse(**user_dict)
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login service temporarily unavailable"
        )

@api_router.post("/auth/signup")
async def signup(user_data: UserCreate):
    try:
        # Check if user already exists
        existing_user = await db.users.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create new user with provided role or default to employee
        user = User(
            name=user_data.name,
            email=user_data.email,
            password_hash=hash_password(user_data.password),
            role=user_data.role,
            department=user_data.department,
            team=user_data.team
        )
        
        await db.users.insert_one(user.dict())
        
        access_token = create_access_token(data={"sub": user.email})
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": UserResponse(**user.dict())
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Signup error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Signup service temporarily unavailable"
        )

@api_router.get("/auth/me")
async def get_current_user_info(current_user: UserResponse = Depends(get_current_user)):
    return current_user

# Password Reset Endpoints
@api_router.post("/auth/request-password-reset")
async def request_password_reset(payload: RequestPasswordResetPayload):
    user = await db.users.find_one({"email": payload.email})
    if not user:
        # IMPORTANT: Do not reveal if the user exists or not for security reasons
        # Still return a 200 OK to prevent email enumeration
        logging.info(f"Password reset requested for non-existent user: {payload.email}")
        return {"message": "If an account with this email exists, a password reset link has been sent."}

    # Generate a secure token
    raw_token = secrets.token_urlsafe(32)
    hashed_token = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()

    # Set token expiry (e.g., 1 hour from now)
    # Ensure IST is used for timezone-aware datetime objects
    expires_at = datetime.now(IST) + timedelta(hours=1)

    await db.users.update_one(
        {"email": payload.email},
        {"$set": {"reset_password_token": hashed_token, "reset_password_expires": expires_at}}
    )

    # Simulate email sending by logging to console
    # In a real application, you would use an email service here
    # Ensure your frontend URL is correctly configured, possibly via an environment variable
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    reset_link = f"{frontend_url}/reset-password?token={raw_token}" # Send raw token in email

    logging.info(f"Password reset link for {payload.email}: {reset_link}")
    # IMPORTANT: This message should be generic to prevent email enumeration
    return {"message": "If an account with this email exists, a password reset link has been sent."}


@api_router.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordPayload):
    if not payload.token or not payload.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token and new password are required."
        )

    hashed_token = hashlib.sha256(payload.token.encode('utf-8')).hexdigest()

    user = await db.users.find_one({
        "reset_password_token": hashed_token,
        "reset_password_expires": {"$gt": datetime.now(IST)}  # Check for expiry against current IST time
    })

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token."
        )

    new_password_hash = hash_password(payload.new_password)
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"password_hash": new_password_hash, "reset_password_token": None, "reset_password_expires": None}}
    )

    return {"message": "Password has been reset successfully."}

@api_router.post("/auth/change-password")
async def change_password(
    payload: ChangePasswordPayload,
    current_user_response: UserResponse = Depends(get_current_user) # Get UserResponse model
):
    # Fetch the full user document from DB to get the password_hash
    user_in_db = await db.users.find_one({"email": current_user_response.email})
    if not user_in_db:
        # This should ideally not happen if get_current_user worked
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not verify_password(payload.current_password, user_in_db["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password."
        )

    if len(payload.new_password) < 6: # Consistent with signup
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long."
        )

    new_password_hash = hash_password(payload.new_password)
    await db.users.update_one(
        {"email": current_user_response.email},
        {"$set": {"password_hash": new_password_hash}}
    )
    return {"message": "Password changed successfully."}


@api_router.get("/departments")
async def get_departments_data(): # Renamed to avoid conflict with any 'departments' variable if used elsewhere
    try:
        return {"departments": DEPARTMENT_DATA}
    except Exception as e:
        logging.error(f"Departments error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Departments service temporarily unavailable"
        )

@api_router.get("/manager-resources")
async def get_manager_resources_data(): # Renamed
    try:
        dynamic_manager_resources = {}
        processed_manager_emails = set()

        for dept_name, teams in DEPARTMENT_DATA.items():
            for team_name, members in teams.items():
                for member in members:
                    designation = member.get("Designation")
                    manager_email = member.get("Email ID")
                    manager_name = member.get("Name")

                    if not manager_email or not manager_name:
                        continue

                    manager_email = manager_email.strip()

                    if designation in ["Reporting manager", "Zonal Managers"] and manager_email not in processed_manager_emails:
                        # Count employees under this manager
                        employee_emails_under_manager = get_all_employee_emails_under_manager(manager_email)
                        resource_count = len(employee_emails_under_manager)
                        dynamic_manager_resources[manager_name] = resource_count
                        processed_manager_emails.add(manager_email)

        return {"manager_resources": dynamic_manager_resources}
    except Exception as e:
        logging.error(f"Error generating dynamic manager resources: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Manager resources service temporarily unavailable"
        )

@api_router.get("/status-options")
async def get_task_status_options(): # Renamed
    try:
        return {"status_options": STATUS_OPTIONS}
    except Exception as e:
        logging.error(f"Status options error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Status options service temporarily unavailable"
        )

@api_router.post("/work-reports")
async def create_work_report(
    report_data: WorkReportCreate,
    current_user: UserResponse = Depends(get_current_user)
):
    try:
        report = WorkReport(
            employee_name=report_data.employee_name,
            employee_email=current_user.email, # Use email from authenticated user
            department=report_data.department,
            team=report_data.team,
            reporting_manager=report_data.reporting_manager,
            date=report_data.date,
            tasks=report_data.tasks,
            last_modified_by=current_user.email # Set initial modifier
        )
        
        await db.work_reports.insert_one(report.dict())
        return {"message": "Work report submitted successfully", "report_id": report.id}
    except Exception as e:
        logging.error(f"Create work report error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Work report service temporarily unavailable"
        )

@api_router.get("/work-reports")
async def get_work_reports_data( # Renamed
    current_user: UserResponse = Depends(get_current_user),
    department: Optional[str] = Query(None),
    team: Optional[str] = Query(None),
    manager: Optional[str] = Query(None), # This is reporting_manager name from report
    employee_email_filter: Optional[str] = Query(None, alias="employee_email"),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None)
):
    try:
        query = {}
        user_org_details = get_user_details_from_department_data(current_user.email)
        user_designation = user_org_details.get("Designation") if user_org_details else None

        # If a specific employee_email_filter is provided (e.g., by an admin), prioritize it.
        if employee_email_filter:
            # Potentially add a check here if current_user has rights to view arbitrary employee reports
            query["employee_email"] = employee_email_filter
        elif current_user.email == "tejaswini@showtimeconsulting.in":
            # Tejaswini gets to see all employee reports for RM's Team Report
            pass # No specific employee_email filter, so all reports will be fetched (respecting other filters like date, dept)
        elif user_designation == "Employee":
            query["employee_email"] = current_user.email
        elif user_designation in ["Reporting manager", "Zonal Managers"]:
            # For managers, fetch reports of employees under them AND their own reports.
            relevant_employee_emails = get_all_employee_emails_under_manager(current_user.email)
            relevant_employee_emails.append(current_user.email) # Add manager's own email
            relevant_employee_emails = list(set(relevant_employee_emails)) # Ensure uniqueness

            if relevant_employee_emails:
                query["employee_email"] = {"$in": relevant_employee_emails}
            else: # Should not happen if manager's own email is included
                query["employee_email"] = current_user.email
        # Directors/admins (if not explicitly "Reporting manager" or "Zonal Managers" but have a different role)
        # might need a broader scope or rely on frontend filters.
        # For now, unhandled designations will result in no implicit employee_email filter here.

        # Apply general filters from query parameters
        if department and department != "All Departments": # Assuming "All Departments" is a frontend value for no filter
            query["department"] = department
        if team and team != "All Teams": # Assuming "All Teams" is for no filter
            query["team"] = team
        if manager and manager != "All Reporting Managers": # Filter by reporting_manager field in the report
            query["reporting_manager"] = manager
        
        if from_date and to_date:
            query["date"] = {"$gte": from_date, "$lte": to_date}
        elif from_date:
            query["date"] = {"$gte": from_date}
        elif to_date:
            query["date"] = {"$lte": to_date}
        
        cursor = db.work_reports.find(query).sort("submitted_at", -1)
        reports = await cursor.to_list(1000)
        
        reports_list = [convert_mongo_doc(report) for report in reports]
        
        return {"reports": reports_list}
    except Exception as e:
        logging.error(f"Get work reports error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Work reports service temporarily unavailable"
        )

@api_router.get("/attendance-summary")
async def get_attendance_summary_data( # Renamed
    current_user: UserResponse = Depends(get_current_user),
    date: Optional[str] = Query(None) # Date from query param
):
    """Get attendance summary for managers on a specific date"""
    try:
        if not date:
            date = datetime.now(IST).strftime("%Y-%m-%d")
        
        reports_on_date_cursor = db.work_reports.find({"date": date})
        reports_on_date = await reports_on_date_cursor.to_list(length=None) # Fetch all
        
        present_employees_by_manager_name: Dict[str, List[str]] = {}
        for report in reports_on_date:
            manager_name_from_report = report.get("reporting_manager")
            employee_email_from_report = report.get("employee_email")
            if not manager_name_from_report or not employee_email_from_report:
                continue

            # We need employee name, not email, for display if that's the current setup
            # For uniqueness, email is better if available
            employee_details = get_user_details_from_department_data(employee_email_from_report)
            employee_name_to_log = employee_details.get("Name") if employee_details else employee_email_from_report

            if manager_name_from_report not in present_employees_by_manager_name:
                present_employees_by_manager_name[manager_name_from_report] = []

            # Ensure unique names/emails if multiple reports from same person (though unlikely for same date)
            if employee_name_to_log not in present_employees_by_manager_name[manager_name_from_report]:
                 present_employees_by_manager_name[manager_name_from_report].append(employee_name_to_log)


        attendance_summary = {}
        
        all_managers_in_org = []
        for dept_name_iter, teams_iter in DEPARTMENT_DATA.items():
            for team_name_iter, members_iter in teams_iter.items():
                for member_iter in members_iter:
                    if member_iter.get("Designation") in ["Reporting manager", "Zonal Managers"]:
                        # Avoid adding duplicates if a manager appears in multiple contexts (though unlikely for this list)
                        is_already_added = any(m.get("Email ID") == member_iter.get("Email ID") for m in all_managers_in_org)
                        if not is_already_added:
                             all_managers_in_org.append(member_iter)
        
        for manager_data in all_managers_in_org:
            manager_name_key = manager_data.get("Name")
            manager_email_key = manager_data.get("Email ID")
            if not manager_name_key or not manager_email_key: continue

            employee_emails_under_this_manager = get_all_employee_emails_under_manager(manager_email_key)
            total_resources_for_manager = len(employee_emails_under_this_manager)

            # If manager has no "Employee" designated people under them, they are not counted as managing resources for this summary.
            if total_resources_for_manager == 0:
                # Check if this manager is a ZM. ZMs might not have direct "Employee" reports
                # if get_all_employee_emails_under_manager only counts "Employee" type.
                # For attendance, we care about who *should* report.
                # Let's adjust: count anyone who lists this manager as reviewer, if they are Employee or ZM.
                # This is complex. Sticking to `get_all_employee_emails_under_manager` for now.
                # If a manager has 0 "Employee" reports, they won't appear in summary with >0 total_resources.
                # This might be fine if we only care about attendance of "Employee" designees.
                 pass # Or skip if total_resources_for_manager == 0 and they are not also an employee themselves.


            present_employee_names_list = present_employees_by_manager_name.get(manager_name_key, [])
            present_count = len(present_employee_names_list)
            
            # Only include managers who have resources or had someone report to them.
            if total_resources_for_manager > 0 or present_count > 0 :
                absent_count = total_resources_for_manager - present_count
                attendance_summary[manager_name_key] = {
                    "total_resources": total_resources_for_manager,
                    "present": present_count,
                    "absent": max(0, absent_count), # Ensure non-negative
                    "present_employees": present_employee_names_list,
                    "manager_email": manager_email_key
                }

        return {
            "date": date,
            "attendance_summary": attendance_summary
        }
    except Exception as e:
        logging.error(f"Attendance summary error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Attendance summary service temporarily unavailable"
        )

@api_router.put("/work-reports/{report_id}")
async def update_work_report_data( # Renamed
    report_id: str,
    report_data: WorkReportUpdate,
    current_user: UserResponse = Depends(get_current_user)
):
    try:
        report = await db.work_reports.find_one({"id": report_id})
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report not found"
            )
        
        # Authorization: Only manager of the employee who submitted or admin/director can edit
        user_org_details = get_user_details_from_department_data(current_user.email)
        report_submitter_details = get_user_details_from_department_data(report.get("employee_email"))

        can_edit = False
        if current_user.role == "manager": # Generic manager role from DB
            # Check if current_user is the direct reviewer of the report submitter
            if report_submitter_details and report_submitter_details.get("Reviewer") == user_org_details.get("Name"):
                can_edit = True
            # Check if current_user is a director (has broader edit rights)
            director_emails_list = [
                "alimpan@showtimeconsulting.in", "at@showtimeconsulting.in",
                "rs@showtimeconsulting.in", "pardhasaradhi@showtimeconsulting.in"
            ]
            if current_user.email in director_emails_list:
                can_edit = True

        if not can_edit:
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to edit this report."
            )

        update_data = {
            "tasks": [task.dict() for task in report_data.tasks],
            "last_modified_at": datetime.now(IST),
            "last_modified_by": current_user.email
        }
        
        result = await db.work_reports.update_one(
            {"id": report_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0 and result.matched_count > 0 :
             return {"message": "Report not modified (data might be the same)"}
        elif result.modified_count == 0: # Should have been caught by find_one if not matched
             raise HTTPException(status_code=404, detail="Report not found or not modified.")


        return {"message": "Report updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Update work report error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Work report update service temporarily unavailable"
        )

@api_router.delete("/work-reports/{report_id}")
async def delete_work_report_data( # Renamed
    report_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    try:
        report = await db.work_reports.find_one({"id": report_id})
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report not found"
            )

        # Authorization logic (similar to edit)
        user_org_details = get_user_details_from_department_data(current_user.email)
        report_submitter_details = get_user_details_from_department_data(report.get("employee_email"))
        can_delete = False
        if current_user.role == "manager":
            if report_submitter_details and report_submitter_details.get("Reviewer") == user_org_details.get("Name"):
                can_delete = True
            director_emails_list = [
                "alimpan@showtimeconsulting.in", "at@showtimeconsulting.in",
                "rs@showtimeconsulting.in", "pardhasaradhi@showtimeconsulting.in"
            ]
            if current_user.email in director_emails_list:
                can_delete = True
        
        if not can_delete:
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to delete this report."
            )

        result = await db.work_reports.delete_one({"id": report_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Report not found or already deleted.")
        
        return {"message": "Report deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Delete work report error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Work report delete service temporarily unavailable"
        )

@api_router.get("/work-reports/export/csv")
async def export_work_reports_csv( # Renamed
    current_user: UserResponse = Depends(get_current_user),
    department: Optional[str] = Query(None),
    team: Optional[str] = Query(None),
    manager: Optional[str] = Query(None), # reporting_manager name
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None)
):
    try:
        # Build query (reuse logic from get_work_reports_data or similar)
        query = {}
        user_org_details = get_user_details_from_department_data(current_user.email)
        user_designation = user_org_details.get("Designation") if user_org_details else None

        if user_designation == "Employee":
            query["employee_email"] = current_user.email
        elif user_designation in ["Reporting manager", "Zonal Managers"]:
            relevant_emails = get_all_employee_emails_under_manager(current_user.email)
            relevant_emails.append(current_user.email) # Include manager's own reports
            query["employee_email"] = {"$in": list(set(relevant_emails))}
        # Directors/Admins will have an empty employee_email query part here, fetching all,
        # then filtered by other params if provided.
        
        if department and department != "All Departments": query["department"] = department
        if team and team != "All Teams": query["team"] = team
        if manager and manager != "All Reporting Managers": query["reporting_manager"] = manager
        
        if from_date and to_date: query["date"] = {"$gte": from_date, "$lte": to_date}
        elif from_date: query["date"] = {"$gte": from_date}
        elif to_date: query["date"] = {"$lte": to_date}
        
        reports_cursor = db.work_reports.find(query).sort("submitted_at", -1)
        reports = await reports_cursor.to_list(10000) # Increased limit for export
        
        output = StringIO()
        fieldnames = ["Date", "Employee Name", "Employee Email", "Department", "Team", "Reporting Manager", "Task Details", "Status", "Submitted At (IST)", "Last Modified At (IST)", "Last Modified By"]
        
        # Using string formatting for CSV rows to avoid csv module dependency if not strictly needed
        header_row = ",".join(fieldnames)
        output.write(header_row + "\n")

        for report_doc in reports:
            # Ensure datetime objects are timezone-aware (assuming stored as UTC or naive, convert to IST)
            submitted_at_dt = report_doc.get("submitted_at")
            last_modified_at_dt = report_doc.get("last_modified_at")

            submitted_at_ist_str = ""
            if submitted_at_dt:
                if submitted_at_dt.tzinfo is None: submitted_at_dt = pytz.utc.localize(submitted_at_dt) # Assume UTC if naive
                submitted_at_ist_str = submitted_at_dt.astimezone(IST).strftime("%Y-%m-%d %H:%M:%S")

            last_modified_at_ist_str = ""
            if last_modified_at_dt:
                if last_modified_at_dt.tzinfo is None: last_modified_at_dt = pytz.utc.localize(last_modified_at_dt) # Assume UTC
                last_modified_at_ist_str = last_modified_at_dt.astimezone(IST).strftime("%Y-%m-%d %H:%M:%S")

            for task in report_doc.get("tasks", []):
                task_details_escaped = '"' + task.get("details", "").replace('"', '""') + '"' # Escape quotes
                row_values = [
                    report_doc.get("date", ""),
                    report_doc.get("employee_name", ""),
                    report_doc.get("employee_email", ""),
                    report_doc.get("department", ""),
                    report_doc.get("team", ""),
                    report_doc.get("reporting_manager", ""),
                    task_details_escaped,
                    task.get("status", ""),
                    submitted_at_ist_str,
                    last_modified_at_ist_str,
                    report_doc.get("last_modified_by","")
                ]
                output.write(",".join(map(str,row_values)) + "\n")
        
        csv_content = output.getvalue()
        output.close()
        
        return StreamingResponse(
            iter([csv_content]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=work_reports.csv"}
        )
    except Exception as e:
        logging.error(f"CSV export error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="CSV export service temporarily unavailable"
        )

@api_router.get("/managers-list") # Renamed to avoid conflict
async def get_managers_list_data(current_user: UserResponse = Depends(get_current_user)):
    try:
        # This could list all users with role "manager", or derive from DEPARTMENT_DATA
        # For now, let's use DEPARTMENT_DATA for consistency as it defines roles.
        managers_from_dept_data = []
        seen_manager_emails = set()
        for dept, teams in DEPARTMENT_DATA.items():
            for team, members in teams.items():
                for member in members:
                    if member.get("Designation") in ["Reporting manager", "Zonal Managers"] and member.get("Email ID"):
                        if member["Email ID"] not in seen_manager_emails:
                            managers_from_dept_data.append({"name": member["Name"], "email": member["Email ID"]})
                            seen_manager_emails.add(member["Email ID"])
        
        return {"managers": managers_from_dept_data}
    except Exception as e:
        logging.error(f"Get managers list error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Managers list service temporarily unavailable"
        )

@api_router.get("/summary-report-data", response_model=List[SummaryReportGroup], name="Hierarchical Summary Report")
async def get_summary_report_data(
    current_user: UserResponse = Depends(get_current_user),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    department_filter: Optional[str] = Query(None, alias="department")
):
    try:
        current_user_details = get_user_details_from_department_data(current_user.email)
        if not current_user_details:
            # This should ideally not happen for logged-in users if DEPARTMENT_DATA is comprehensive
            logging.error(f"Critical: User {current_user.email} not found in DEPARTMENT_DATA.")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User details not found in organizational data.")

        final_summary_groups: List[SummaryReportGroup] = []

        # Determine overall scope for fetching reports (who is viewing)
        director_emails_list = [
            "alimpan@showtimeconsulting.in", "at@showtimeconsulting.in",
            "rs@showtimeconsulting.in", "pardhasaradhi@showtimeconsulting.in"
        ]
        # Allow Tejaswini to have the same broad view as directors for the summary report
        is_director_or_admin_view = current_user.email in director_emails_list or \
                                    current_user.email == "tejaswini@showtimeconsulting.in"

        # Iterate through DEPARTMENT_DATA to define the primary groups based on Team RMs
        for dept_name, teams in DEPARTMENT_DATA.items():
            # Apply department filter from query IF provided by a director/admin (or Tejaswini)
            if department_filter and department_filter != "All Departments" and is_director_or_admin_view:
                if dept_name != department_filter:
                    continue

            for team_name, members in teams.items():
                team_reporting_managers = [m for m in members if m.get("Designation") == "Reporting manager"]

                for team_rm_details in team_reporting_managers:
                    team_rm_name = team_rm_details.get("Name")
                    team_rm_email = team_rm_details.get("Email ID")

                    # If not a director/admin/Tejaswini view, only process for the current user if they are this Team RM
                    if not is_director_or_admin_view and current_user.email != team_rm_email:
                        # Also, if current user is a ZM, this loop structure won't directly give them their view.
                        # This endpoint is now geared towards RMs or Directors/Tejaswini.
                        # Employees use /user-summary-report. ZMs viewing their team might need specific handling
                        # or use the Team Report view. For this Summary, if user is a ZM, they won't match here.
                        # A ZM's summary report (if they are not also a designated RM for a team) is not covered by this loop.
                        # This endpoint is for team RMs or full view for directors.
                        # If current_user is a ZM, their reports are fetched if is_director_or_admin_view is true and they submitted something.
                        # But they won't be a team_rm_details to generate a group *they manage*.
                        # This is fine, as ZMs are not the top-level RM for the group structure requested.
                        continue

                    personnel_in_structure_emails = set()
                    personnel_in_structure_details = [] # To store full details for later use if needed

                    # 1. Add the Team RM
                    if team_rm_email:
                        personnel_in_structure_emails.add(team_rm_email)
                        personnel_in_structure_details.append(team_rm_details)

                    # 2. Find Zonal Managers in this Dept/Team reporting to this Team RM
                    zonal_managers_in_team = [
                        zm for zm in members
                        if zm.get("Designation") == "Zonal Managers" and zm.get("Reviewer") == team_rm_name
                    ]
                    for zm_details in zonal_managers_in_team:
                        if zm_details.get("Email ID"):
                            personnel_in_structure_emails.add(zm_details["Email ID"])
                            personnel_in_structure_details.append(zm_details)

                        # 3. Find Employees under these Zonal Managers in this Dept/Team
                        for emp_details in members:
                            if emp_details.get("Designation") == "Employee" and \
                               emp_details.get("Reviewer") == zm_details.get("Name") and \
                               emp_details.get("Email ID"):
                                personnel_in_structure_emails.add(emp_details["Email ID"])
                                personnel_in_structure_details.append(emp_details)

                    # 4. Find Employees directly reporting to the Team RM in this Dept/Team
                    for emp_details in members:
                        if emp_details.get("Designation") == "Employee" and \
                           emp_details.get("Reviewer") == team_rm_name and \
                           emp_details.get("Email ID"):
                            personnel_in_structure_emails.add(emp_details["Email ID"])
                            personnel_in_structure_details.append(emp_details)

                    if not personnel_in_structure_emails:
                        continue # No one in this structure to report

                    # Fetch reports for all personnel in this structure
                    report_query = {"employee_email": {"$in": list(personnel_in_structure_emails)}}
                    if from_date and to_date: report_query["date"] = {"$gte": from_date, "$lte": to_date}
                    elif from_date: report_query["date"] = {"$gte": from_date}
                    elif to_date: report_query["date"] = {"$lte": to_date}

                    # Ensure reports are also from the correct dept and team if structure is complex
                    # (though personnel_in_structure_emails are already from this dept/team)
                    report_query["department"] = dept_name
                    report_query["team"] = team_name

                    team_reports_cursor = db.work_reports.find(report_query)
                    team_all_reports = await team_reports_cursor.to_list(length=None)

                    tasks_by_status_for_group: Dict[str, List[SummaryTaskDetail]] = {opt: [] for opt in STATUS_OPTIONS}
                    for report in team_all_reports:
                        for task_data in report['tasks']:
                            status = task_data['status']
                            task_detail = SummaryTaskDetail(details=task_data['details'])
                            if status in tasks_by_status_for_group: # Ensure status is valid
                                tasks_by_status_for_group[status].append(task_detail)
                            else: # Handle unexpected status if necessary
                                 if "Other" not in tasks_by_status_for_group: tasks_by_status_for_group["Other"] = []
                                 tasks_by_status_for_group["Other"].append(task_detail)


                    # Calculate No of Resource: unique personnel (RMs, ZMs, Employees) in this specific structure
                    # This counts everyone identified for this group, including the Team RM and ZMs.
                    num_resources_in_structure = len(personnel_in_structure_emails)

                    group_obj = SummaryReportGroup(
                        department=dept_name,
                        team=team_name,
                        reporting_manager=team_rm_name,
                        no_of_resource=num_resources_in_structure if num_resources_in_structure > 0 else 1,
                        tasks_by_status=tasks_by_status_for_group,
                        reviewer=team_rm_details.get("Reviewer", "N/A")
                    )
                    final_summary_groups.append(group_obj)

        # Sort tasks by status according to STATUS_OPTIONS order for each group
        for group_obj in final_summary_groups:
            for status_option in STATUS_OPTIONS:
                if status_option not in group_obj.tasks_by_status:
                    group_obj.tasks_by_status[status_option] = []
            # Sort tasks by status according to STATUS_OPTIONS order
            group_obj.tasks_by_status = {
                status_val: group_obj.tasks_by_status[status_val]
                for status_val in STATUS_OPTIONS if status_val in group_obj.tasks_by_status
            }
            # Ensure all STATUS_OPTIONS keys exist, even if list is empty
            for status_val in STATUS_OPTIONS:
                if status_val not in group_obj.tasks_by_status:
                    group_obj.tasks_by_status[status_val] = []


        return final_summary_groups

    except Exception as e:
        logging.error(f"Error in get_summary_report_data: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate summary report data."
        )

# Admin Endpoints
@api_router.get("/admin/users", response_model=List[UserResponse], name="Admin: List Users")
async def admin_list_users(current_user: UserResponse = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this resource."
        )

    users_cursor = db.users.find({})
    all_users = await users_cursor.to_list(length=None) # Fetch all users

    # Convert MongoDB docs to UserResponse model, excluding password_hash etc.
    user_responses = [UserResponse(**convert_mongo_doc(user)) for user in all_users]
    return user_responses

@api_router.post("/admin/users/{user_id}/reset-password", name="Admin: Reset User Password")
async def admin_reset_user_password(
    user_id: str, # This will be the string representation of MongoDB ObjectId for the target user
    current_user: UserResponse = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action."
        )

    # Prevent admin from resetting their own password via this specific admin endpoint
    # They should use the standard change password flow if they want to change their own.
    target_user_to_check_self_reset = await db.users.find_one({"id": user_id}) # Assuming 'id' is the custom UUID field
    if not target_user_to_check_self_reset:
        # Try finding by MongoDB's _id if 'id' field is not what's passed or uniformly used
        from bson import ObjectId
        try:
            target_user_to_check_self_reset = await db.users.find_one({"_id": ObjectId(user_id)})
        except Exception: # Invalid ObjectId format
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with ID {user_id} not found or ID format is invalid.")

    if not target_user_to_check_self_reset:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with ID {user_id} not found.")

    if target_user_to_check_self_reset["email"] == current_user.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admins cannot reset their own password using this endpoint. Please use the standard password change mechanism."
        )

    default_password = "Welcome@123"
    new_password_hash = hash_password(default_password)

    # Determine if user_id is the custom 'id' field or MongoDB '_id'
    # The UserResponse model has 'id', which is our custom UUID.
    # Let's assume the frontend will send this custom 'id'.
    update_result = await db.users.update_one(
        {"id": user_id}, # Query by custom 'id' field
        {"$set": {"password_hash": new_password_hash,
                  "reset_password_token": None, # Clear any pending password reset tokens
                  "reset_password_expires": None}}
    )

    if update_result.matched_count == 0:
        # If no match with 'id', try with '_id' as a fallback, though 'id' should be standard
        from bson import ObjectId # Ensure it's imported if not already
        try:
            obj_id = ObjectId(user_id)
            update_result = await db.users.update_one(
                {"_id": obj_id},
                {"$set": {"password_hash": new_password_hash, "reset_password_token": None, "reset_password_expires": None}}
            )
            if update_result.matched_count == 0:
                 raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with ID {user_id} not found.")
        except Exception: # Invalid ObjectId format if user_id was not an ObjectId string
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with ID {user_id} not found or ID format is invalid (tried custom ID and MongoDB _id).")


    if update_result.modified_count == 0 and update_result.matched_count > 0:
        # This could happen if the password was already "Welcome@123"
        return {"message": f"User {user_id}'s password was already the default or no change was made."}

    return {"message": f"Password for user {user_id} has been reset to the default."}


@api_router.get("/user-summary-report", response_model=List[SummaryReportGroup])
async def get_user_summary_report_data( # Renamed
    current_user: UserResponse = Depends(get_current_user),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None)
):
    try:
        user_org_details = get_user_details_from_department_data(current_user.email)
        if not user_org_details:
             raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User details not found in organizational data."
            )

        query = {"employee_email": current_user.email}
        if from_date and to_date: query["date"] = {"$gte": from_date, "$lte": to_date}
        elif from_date: query["date"] = {"$gte": from_date}
        elif to_date: query["date"] = {"$lte": to_date}

        reports_cursor = db.work_reports.find(query).sort("date", 1)
        all_reports = await reports_cursor.to_list(length=None)

        if not all_reports:
            empty_group = SummaryReportGroup(
                department=user_org_details.get("Department", "N/A"),
                team=user_org_details.get("Team", "N/A"),
                reporting_manager=user_org_details.get("Reviewer", "N/A"),
                no_of_resource=1,
                tasks_by_status={status_opt: [] for status_opt in STATUS_OPTIONS},
                reviewer= get_user_details_from_department_data(user_org_details.get("Reviewer","")).get("Reviewer") if user_org_details.get("Reviewer") else "N/A"
            )
            return [empty_group]

        tasks_by_status_for_user: Dict[str, List[SummaryTaskDetail]] = {}
        for report in all_reports:
            for task_data in report['tasks']:
                status = task_data['status']
                task_detail = SummaryTaskDetail(details=task_data['details'])
                if status not in tasks_by_status_for_user:
                    tasks_by_status_for_user[status] = []
                tasks_by_status_for_user[status].append(task_detail)

        for status_option in STATUS_OPTIONS:
            if status_option not in tasks_by_status_for_user:
                tasks_by_status_for_user[status_option] = []

        sorted_tasks_by_status = {
            status: tasks_by_status_for_user[status]
            for status in STATUS_OPTIONS if status in tasks_by_status_for_user
        }
        for status_val in STATUS_OPTIONS: # Ensure all keys
             if status_val not in sorted_tasks_by_status: sorted_tasks_by_status[status_val] = []


        employee_manager_name = user_org_details.get("Reviewer", "N/A")
        employee_manager_details = get_user_details_from_department_data(employee_manager_name) # This is problematic if name is not email

        # To get manager's reviewer, we need manager's email.
        # Let's find manager's email by their name (Reviewer field).
        manager_email_for_reviewer_lookup = None
        if employee_manager_name != "N/A":
            for dept_teams in DEPARTMENT_DATA.values():
                for team_members in dept_teams.values():
                    for member_item in team_members:
                        if member_item.get("Name") == employee_manager_name:
                            manager_email_for_reviewer_lookup = member_item.get("Email ID")
                            break
                    if manager_email_for_reviewer_lookup: break
            if manager_email_for_reviewer_lookup:
                 employee_manager_details = get_user_details_from_department_data(manager_email_for_reviewer_lookup)


        employee_summary_group = SummaryReportGroup(
            department=user_org_details.get("Department", "N/A"),
            team=user_org_details.get("Team", "N/A"),
            reporting_manager=employee_manager_name,
            no_of_resource=1,
            tasks_by_status=sorted_tasks_by_status,
            reviewer=employee_manager_details.get("Reviewer", "N/A") if employee_manager_details else "N/A"
        )

        return [employee_summary_group]

    except Exception as e:
        logging.error(f"Error in get_user_summary_report: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate user summary report data."
        )

# Include the router in the main app
app.include_router(api_router)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Mangum handler for Vercel serverless (not needed for Render)
handler = Mangum(app)

# For Render deployment
if __name__ == "__main__":
    import uvicorn
    # Ensure PORT is an int. Default to 8000 for local dev.
    # Render injects PORT as a string.
    port_str = os.environ.get("PORT", "8000")
    try:
        port = int(port_str)
    except ValueError:
        logger.error(f"Invalid PORT environment variable: {port_str}. Defaulting to 8000.")
        port = 8000

    host = os.environ.get("HOST", "0.0.0.0") # Default host

    # Check for reload flag, common in development
    reload_flag = os.environ.get("UVICORN_RELOAD", "false").lower() == "true"

    logger.info(f"Starting Uvicorn server on {host}:{port} with reload: {reload_flag}")

    uvicorn.run(
        "server:app", # app string for Uvicorn
        host=host,
        port=port,
        reload=reload_flag, # Enable reload if UVICORN_RELOAD is true
        workers=int(os.environ.get("WEB_CONCURRENCY", 1)) # For Render, use WEB_CONCURRENCY
    )
