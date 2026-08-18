-- Client-generated thumbnail for files above the image-transform source limit;
-- null when the original is small enough to transform.
alter table photos add column thumbnail_path text;
