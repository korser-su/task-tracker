FROM python:3.11-buster

ENV DEBIAN_FRONTEND noninteractive

# Принудительно ставим часовой пояс в контейнере
ENV TZ=Europe/Moscow
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

COPY /code /srv/www/code

WORKDIR /srv/www/code

RUN pip install -r requirements.txt --ignore-installed --force-reinstall --upgrade --no-cache-dir