-- Pixel size of the image a gallery renders, so a tile can reserve its height
-- before the image arrives. Null when the size was never recorded.
alter table photos
  add column image_width integer,
  add column image_height integer;
