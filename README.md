I have written below whatever I understand of LLM and this project.
## Resume analyser I created
The analyser uses frontend written using React which has two upload options, Resume and Job Description uploading. Then option of 
Run analysis is present which sees how Resume is aligned with Job Description. Q and A section at very bottom gives proper answer to question asked to it.
## screenshots of it
![alt text](https://github.com/NeerajChandratre/resume_analyzer/blob/main/publc_share_anlyzr_wrkn1.png)
![alt_text](https://github.com/NeerajChandratre/resume_analyzer/blob/main/publc_share_anlyzr_wrkn2.png)
In above images, you can see proper analysis and good answer of resume and job description being put
## steps to run it in short
The backend code can be run using running the command node server.js command in terminal. I think you will have to install dependencies using npm install I guess.
The frontend code can be run using command npm run dev by going inside root directory. For installing its dependencies too, I think you will have to do npm install. For frontend, I have used React.
I request you to run the init_db.js and init_jd_db.js so as to create a db of both Job Description and Resume before running the frontend and backend. I request you to clear these db when you are using new Resume and new Job Description.
## Working principle of frontend and backend code
- Concerning backend, firstly the program has post as upload which accepts pdf of Resume from user. The Resume is categorized into summary, skills, education, experience etc. These categories are found in extractSections function. After categorizing text into respective categories, we take some chunk if it and each chunk is given a vector. The vectors are then stored using sqlite. Similar is the case of Job Description pdf. It is uploaded and then sentences are split inside it into chunks and each new line breaks these sentences. We then take vector and put into sqlite database.
- Secondly, in backend,there is analyze command which gives us insights about the resume when compared with Job Description. From whatever I understand, I see the rows of job embeddings are taken and average of vectors of them is taken. Then highest similar embeddings from resume and JD, which is Job Description is obtained. This gives then chunk of text which is closer to Resume and JD. From that, we get insights as we command the llm to compare and see.
- Thirdly, in backend, we ask question and its embeddings are created. We get similar embeddings from Resume database and we get respective text of them. This text along with question is given to llm which then gives us an answer which answers the question mostly.
- Concerning frontend, we use useState which sets the values of respective parameters in certain conditions. There are conditions given which checks if pdf is there or not. Then rest of the code which makes the frontend has buttons, horizontal lines etc.
## Materials added in repo
I have added two resume and screenshots which show good results. I also have added two dummy job description.
